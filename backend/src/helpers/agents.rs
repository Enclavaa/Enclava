use std::path::{Path, PathBuf};

use actix_web::web;
use alloy::{
    primitives::utils::format_units,
    providers::{Provider, ProviderBuilder},
    sol,
    sol_types::SolEvent,
};
use dashmap::DashMap;
use rig::{agent::Agent, completion::Prompt, providers::gemini::completion::CompletionModel};

use color_eyre::{Result, eyre::Context};
use serde_json::json;

use crate::{
    config::{
        APP_CONFIG, DATASET_DETAILS_GEN_AGENT_MODEL, ENCLAVA_CONTRACT_ADDRESS, INIT_AGENT_MODEL,
        UPLOAD_DIR,
    },
    database,
    state::AppState,
    types::{AgentCategory, AgentDb, DatasetAIDetails, UserDb},
};

sol! {
    event DatasetUsed(uint256 indexed tokenId, address indexed user, uint256 amount);
}

pub async fn init_ai_agent_with_dataset(
    _user: &UserDb,
    agent_db: &AgentDb,
    dataset_csv_path: &PathBuf,
    app_state: &web::Data<AppState>,
) -> Result<()> {
    // Initialize the AI agent with the specified model and dataset
    let ai_model = &app_state.ai_model;

    let agent = init_agent(&dataset_csv_path, ai_model, &agent_db).await?;

    // Save the agent to the AppState tee_agents using its id
    app_state.tee_agents.insert(agent_db.id, agent);

    Ok(())
}

pub async fn load_db_agents(
    db: &sqlx::Pool<sqlx::Postgres>,
    ai_model: &rig::providers::gemini::Client,
) -> Result<DashMap<i64, Agent<CompletionModel>>> {
    let tee_agents = DashMap::new();

    let db_agents = sqlx::query_as!(
        AgentDb,
        r#"
    SELECT
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at,
        g.nft_id,
        g.nft_tx, 
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id
    "#
    )
    .fetch_all(db)
    .await?;

    for agent_db in db_agents {
        let dataset_csv_path = Path::new(UPLOAD_DIR).join(&agent_db.dataset_path);

        let agent = init_agent(&dataset_csv_path, ai_model, &agent_db).await?;

        tee_agents.insert(agent_db.id, agent);
    }

    Ok(tee_agents)
}

pub async fn generate_dataset_details(
    csv_text: &str,
    ai_model: &rig::providers::gemini::Client,
) -> Result<DatasetAIDetails> {
    let agent = ai_model.agent(DATASET_DETAILS_GEN_AGENT_MODEL)
    .preamble("You Are an AI agent that would generate the name, description and category of a sepcific csv dataset. The name should be short and sweet. The Description Should be not too long or too short. It should be very representative of the dataset cause other ai agents will rely on teh generated description to decide wether to use this dataset or not. The category should be one of the following: Web3, Financial, Analytics, Healthcare, IoT, Gaming, Consumer Data, Social Media, Environmental. Return the response as a json object with the following format: {{name: string, description: string, category: string}}. ")
    .temperature(0.0)
    .build();

    let prompt = format!(
        "Please generate the name, description and category of the following csv dataset. The csv dataset is the following: {}",
        csv_text
    );

    let response = agent.prompt(prompt).await?;

    // Remove any markdown from the response
    let formatted_response = response.replace("```json", "").replace("```", "");

    tracing::debug!(
        "Formatted Generate Dataset Details AI response after removing markdown: {}",
        formatted_response
    );

    let dataset_details: DatasetAIDetails = serde_json::from_str(&formatted_response)
        .context("Failed to parse AI response as DatasetAIDetails")?;

    Ok(dataset_details)
}

pub async fn verif_selected_agents_payment(
    app_state: &web::Data<AppState>,
    agent_ids: &Vec<i64>,
    tx_hash: &str,
) -> Result<bool> {
    // Check if the tx hash is already handled
    if app_state.handled_txs.contains(tx_hash) {
        tracing::error!("Transaction hash {} already handled", tx_hash);
        return Ok(false);
    }

    // Get all agents from the database
    let db = &app_state.db;

    let agents_db = database::get_agents_by_ids(db, agent_ids).await?;

    let total_price_to_pay = agents_db.iter().fold(0.0, |acc, agent| acc + agent.price);

    tracing::debug!("Total price to pay By Used Agents: {}", total_price_to_pay);

    let rpc_url = &APP_CONFIG.alchemy_rpc_url;

    let provider = ProviderBuilder::new().connect_http(rpc_url.parse()?);

    let tx_receipt = provider.get_transaction_receipt(tx_hash.parse()?).await?;

    if tx_receipt.is_none() {
        tracing::error!("Transaction receipt not found for tx hash: {}", tx_hash);
        return Ok(false);
    }

    let tx_receipt = tx_receipt.unwrap();

    // Check if the tx is sucess
    let tx_success = tx_receipt.status();

    if !tx_success {
        tracing::error!("Transaction of {} is not successful", tx_hash);
        return Ok(false);
    }

    // Chck if the tx is for the correct enclava smart contract
    let tx_contract = tx_receipt.to;

    if tx_contract != Some(ENCLAVA_CONTRACT_ADDRESS.parse()?) {
        tracing::error!(
            "Transaction of {} is not for the correct contract. Expected: {} Found: {:?}",
            tx_hash,
            ENCLAVA_CONTRACT_ADDRESS,
            tx_contract
        );
        return Ok(false);
    }

    // Get the tx logs and decode them
    let tx_logs = tx_receipt.logs();

    let mut total_amount_paid = 0.0;

    for log in tx_logs {
        let log_data = log.data();

        if let Ok(decoded_log) = DatasetUsed::decode_log_data(log_data) {
            let amount_paid_u256 = decoded_log.amount;
            let token_nft_id = decoded_log.tokenId;

            let amount_paid: f64 = format_units(amount_paid_u256, 18)?.parse()?;
            let nft_id: i64 = token_nft_id.to_string().parse()?;

            tracing::debug!("Amount paid: {}", amount_paid);
            tracing::debug!("NFT ID: {}", nft_id);

            // Get the agent that has the nft_id
            let agent = agents_db.iter().find(|agent| agent.nft_id == Some(nft_id));

            if agent.is_none() {
                tracing::error!("Agent with nft_id {} not found", nft_id);
                return Ok(false);
            }

            let agent = agent.unwrap();

            if agent.price > amount_paid {
                tracing::error!(
                    "Agent {} price is {} but only {} was paid",
                    agent.id,
                    agent.price,
                    amount_paid
                );
                return Ok(false);
            }

            total_amount_paid += amount_paid;
        }
    }

    if total_amount_paid < total_price_to_pay {
        tracing::error!(
            "Total amount paid {} is less than total price to pay {}",
            total_amount_paid,
            total_price_to_pay
        );
        return Ok(false);
    }

    // Add the transaction hash to the app_state for future reference
    app_state.handled_txs.insert(tx_hash.to_string());

    Ok(true)
}

async fn init_agent(
    dataset_csv_path: &PathBuf,
    ai_model: &rig::providers::gemini::Client,
    agent_db: &AgentDb,
) -> Result<Agent<CompletionModel>> {
    let agent_builder = ai_model.agent(INIT_AGENT_MODEL);

    let dataset_content = tokio::fs::read_to_string(dataset_csv_path).await?;

    let agent_instruction = format!(
        "You are an AI agent ({}) who is responsible for answering questions about the csv dataset added to you (it is your only context). Do not use any other knowledge source to answer questions. Return only the answer. PLease Do not reveal any personal information about specific user like its email, name, phone number, etc. The Dataset description is {}. The Dataset Category is {}. The Dataset csv : {}",
        agent_db.name,
        agent_db.description,
        agent_db.category.to_string(),
        dataset_content
    );

    let agent = agent_builder
        .name(&agent_db.name)
        .preamble(&agent_instruction)
        .temperature(0.0)
        .additional_params(json!(
            {
                "description": agent_db.description,
                "owner_id": agent_db.owner_id
            }
        ))
        .build();

    Ok(agent)
}

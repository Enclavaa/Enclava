use std::path::{Path, PathBuf};

use actix_web::web;
use dashmap::DashMap;
use rig::{agent::Agent, completion::Prompt, providers::gemini::completion::CompletionModel};

use color_eyre::{Result, eyre::Context};
use serde_json::json;

use crate::{
    config::{DATASET_DETAILS_GEN_AGENT_MODEL, INIT_AGENT_MODEL, UPLOAD_DIR},
    state::AppState,
    types::{AgentCategory, AgentDb, DatasetAIDetails, UserDb},
};

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

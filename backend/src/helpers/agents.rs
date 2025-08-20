use std::path::{Path, PathBuf};

use actix_web::web;
use dashmap::DashMap;
use rig::{
    agent::Agent,
    providers::gemini::completion::{CompletionModel, GEMINI_2_5_FLASH_PREVIEW_05_20},
};

use color_eyre::Result;
use serde_json::json;

use crate::{
    config::UPLOAD_DIR,
    state::AppState,
    types::{AgentCategory, AgentDb, UserDb},
};

pub async fn init_ai_agent_with_dataset(
    user: &UserDb,
    agent_db: &AgentDb,
    dataset_csv_path: &PathBuf,
    app_state: &web::Data<AppState>,
) -> Result<()> {
    // Initialize the AI agent with the specified model and dataset
    let ai_model = &app_state.ai_model;

    let agent_builder = ai_model.agent("gemini-2.5-flash");

    let dataset_content = tokio::fs::read_to_string(dataset_csv_path).await?;

    let agent_instruction = format!(
        "You are an AI agent ({}) who is responsible for answering questions about the csv dataset added to you (it is your only context). Do not use any other knowledge source to answer questions. Return only the answer. The Dataset description is {}. The Dataset csv : {}",
        agent_db.name, agent_db.description, dataset_content
    );

    let agent = agent_builder
        .name(&agent_db.name)
        .preamble(&agent_instruction)
        .temperature(0.0)
        .additional_params(json!(
            {
                "description": agent_db.description,
                "owner_id": user.id
            }
        ))
        .build();

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
        id,
        name,
        description,
        price,
        owner_id,
        dataset_path,
        status,
        category as "category: AgentCategory",
        created_at,
        updated_at
    FROM agents"#
    )
    .fetch_all(db)
    .await?;

    for agent_db in db_agents {
        let dataset_csv_path = Path::new(UPLOAD_DIR).join(&agent_db.dataset_path);

        let agent_builder = ai_model.agent("gemini-2.5-flash");

        let dataset_content = tokio::fs::read_to_string(dataset_csv_path).await?;

        let agent_instruction = format!(
            "You are an AI agent ({}) who is responsible for answering questions about the csv dataset added to you (it is your only context). Do not use any other knowledge source to answer questions. Return only the answer. The Dataset description is {}. The Dataset csv : {}",
            agent_db.name, agent_db.description, dataset_content
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

        tee_agents.insert(agent_db.id, agent);
    }

    Ok(tee_agents)
}

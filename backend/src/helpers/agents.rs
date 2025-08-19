use std::path::PathBuf;

use actix_web::web;
use rig::providers::gemini::completion::GEMINI_2_5_FLASH_PREVIEW_05_20;

use color_eyre::Result;
use serde_json::json;

use crate::{state::AppState, types::{AgentDb, UserDb}};

pub async fn init_ai_agent_with_dataset(
    user: &UserDb,
    agent_db: &AgentDb,
    dataset_csv_path: &PathBuf,
    app_state: &web::Data<AppState>,
) -> Result<()> {
    // Initialize the AI agent with the specified model and dataset
    let ai_model = &app_state.ai_model;

    let agent_builder = ai_model.agent(GEMINI_2_5_FLASH_PREVIEW_05_20);

    let dataset_content = tokio::fs::read_to_string(dataset_csv_path).await?;

    let agent_instruction = format!(
        "You are an AI agent ({}) who is responsible for answering questions about the csv dataset added to you (it is your only context). Do not use any other knowledge source to answer questions. The Dataset description is {}",
        agent_db.name, agent_db.description
    );

    let agent = agent_builder
        .name(&agent_db.name)
        .preamble(&agent_instruction)
        .context(&dataset_content)
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

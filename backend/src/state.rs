use std::collections::HashMap;

use dashmap::{DashMap, DashSet};
use rig::{agent::Agent, client::ProviderClient, providers};
use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

use crate::{config::APP_CONFIG, helpers::agents::load_db_agents};

use tracing::info;

pub struct AppState {
    pub db: Pool<Postgres>,
    pub ai_model: providers::gemini::Client,
    pub tee_agents: DashMap<i64, Agent<providers::gemini::completion::CompletionModel>>,
    pub handled_txs: DashSet<String>,
}

impl AppState {
    pub async fn new() -> Self {
        // Initialize your application state fields here
        let db_url = APP_CONFIG.database_url.clone();

        // Establish the database connection asynchronously
        let db = PgPoolOptions::new()
            .max_connections(5)
            .connect(&db_url)
            .await
            .expect("Error connecting to the Postgres database");

        info!("Database connection established successfully");

        let ai_model = providers::gemini::Client::from_env();

        info!("AI model client initialized successfully");

        // Normally those tee agent will be on another enclave that will never stops, but for now we should intize them again using agents db table.
        let tee_agents = load_db_agents(&db, &ai_model)
            .await
            .expect("Failed to load agents from database");

        info!("{} Tee agents loaded successfully", tee_agents.len());

        let handled_txs = DashSet::new();

        Self {
            db,
            ai_model,
            tee_agents,
            handled_txs,
        }
    }
}

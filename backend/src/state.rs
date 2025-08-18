use sqlx::{Pool, Postgres, postgres::PgPoolOptions};

use crate::config::APP_CONFIG;

use tracing::info;

pub struct AppState {
    pub db: Pool<Postgres>,
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

        Self { db }
    }
}

use once_cell::sync::Lazy;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub port: u16,
}

impl AppConfig {
    pub fn load() -> Self {
        dotenvy::dotenv().ok();

        Self {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8080".to_string())
                .parse()
                .expect("PORT must be a valid u16"),
        }
    }
}
pub const UPLOAD_DIR: &str = "./uploads";
pub const INIT_AGENT_MODEL: &str = "gemini-2.5-flash";
pub const ROUTER_AGENT_MODEL: &str = "gemini-2.0-flash-lite";
pub const DATASET_DETAILS_GEN_AGENT_MODEL: &str = "gemini-2.0-flash-lite";


// Define a globally accessible static Config instance
pub static APP_CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::load);

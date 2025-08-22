use once_cell::sync::Lazy;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub alchemy_rpc_url: String,
    pub alchemy_ws_url: String,
    pub port: u16,
}

impl AppConfig {
    pub fn load() -> Self {
        dotenvy::dotenv().ok();

        let alchemy_http_url =
            std::env::var("ALCHEMY_RPC_URL").expect("ALCHEMY_RPC_URL must be set");
        let alchemy_ws_url = alchemy_http_url.replace("https://", "wss://");

        Self {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            alchemy_rpc_url: alchemy_http_url,
            alchemy_ws_url,
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
pub const ENCLAVA_CONTRACT_ADDRESS: &str = "0x015C507e3E79D5049b003C3bE5b2E208A4Bb7e56";
pub const MAX_ALLOWED_SELECTED_AGENTS: usize = 3;

// Define a globally accessible static Config instance
pub static APP_CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::load);

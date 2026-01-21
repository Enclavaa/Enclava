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
pub const INIT_AGENT_MODEL: &str = "gemini-flash-latest";
pub const ROUTER_AGENT_MODEL: &str = "gemini-flash-lite-latest";
pub const DATASET_DETAILS_GEN_AGENT_MODEL: &str = "gemini-flash-lite-latest";
// pub const ENCLAVA_CONTRACT_ADDRESS: &str = "0x015C507e3E79D5049b003C3bE5b2E208A4Bb7e56";
pub const ENCLAVA_CONTRACT_ADDRESS: &str = "0xc409D09C1B5bE78FFB344fBAa70901cAeB79458B";
pub const MAX_ALLOWED_SELECTED_AGENTS: usize = 3;
pub const HEDERA_TESTNET_RPC_URL: &str = "https://testnet.hashio.io/api";

// Define a globally accessible static Config instance
pub static APP_CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::load);

use once_cell::sync::Lazy;

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub database_url: String,
    pub port: u16,
    pub hedera_rpc_url: String,
    pub hedera_mirror_node_url: String,
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
            hedera_rpc_url: std::env::var("HEDERA_RPC_URL")
                .unwrap_or_else(|_| "https://testnet.hashio.io/api".to_string()),
            hedera_mirror_node_url: std::env::var("HEDERA_MIRROR_NODE_URL")
                .unwrap_or_else(|_| "https://testnet.mirrornode.hedera.com".to_string()),
        }
    }
}
pub const UPLOAD_DIR: &str = "./uploads";
pub const INIT_AGENT_MODEL: &str = "gemini-2.5-flash";
pub const ROUTER_AGENT_MODEL: &str = "gemini-2.0-flash-lite";
pub const DATASET_DETAILS_GEN_AGENT_MODEL: &str = "gemini-2.0-flash-lite";
// pub const ENCLAVA_CONTRACT_ADDRESS: &str = "0x015C507e3E79D5049b003C3bE5b2E208A4Bb7e56";
pub const ENCLAVA_CONTRACT_ADDRESS: &str = "0xc409D09C1B5bE78FFB344fBAa70901cAeB79458B";
pub const MAX_ALLOWED_SELECTED_AGENTS: usize = 3;
pub const HEDERA_TESTNET_RPC_URL: &str = "https://testnet.hashio.io/api";

// Define a globally accessible static Config instance
pub static APP_CONFIG: Lazy<AppConfig> = Lazy::new(AppConfig::load);

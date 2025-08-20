use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::prelude::Type;
use utoipa::ToSchema;

#[derive(Serialize, ToSchema)]
pub struct DatasetUploadResponse {
    /// Success status of the upload
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Unique identifier for the uploaded file
    pub file_id: Option<String>,
    /// Original filename
    pub filename: Option<String>,
    /// File size in bytes
    pub file_size: Option<u64>,
    /// Number of rows in the CSV (excluding header)
    pub row_count: Option<usize>,
    /// Dataset metadata
    pub metadata: Option<DatasetMetadata>,
}

#[derive(Serialize, ToSchema)]
pub struct ErrorResponse {
    /// Error status
    pub success: bool,
    /// Error message
    pub message: String,
    /// Error code for programmatic handling
    pub error_code: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct DatasetMetadata {
    /// Blockchain address of the user
    pub user_address: String,
    /// Dataset price
    #[schema(minimum = 1.0, maximum = 50000000.0)]
    pub dataset_price: f64,
    /// Description of the dataset
    pub description: String,
    /// Name of the dataset
    pub name: String,
    /// Category of dataset
    pub category: AgentCategory,
}

#[derive(ToSchema)]
pub struct DatasetUploadRequest {
    /// CSV file to upload
    #[schema(value_type = String, format = Binary)]
    pub file: Vec<u8>,
    /// Blockchain address of the user
    pub user_address: String,
    /// Dataset price
    #[schema(minimum = 1.0, maximum = 5800000.0)]
    pub dataset_price: f64,
    /// Description of the dataset
    pub description: String,
    /// Name of the dataset
    pub name: String,
    // Category of dataset
    pub category: AgentCategory,
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Debug)]
pub struct UserDb {
    pub id: i64,
    pub address: String,
}

#[derive(Debug, sqlx::FromRow, Serialize, Deserialize, Clone, ToSchema)]
pub struct AgentDb {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub owner_id: i64,
    pub dataset_path: String,
    pub category: AgentCategory,
    pub status: String,
    #[schema(value_type = String, format = DateTime)]
    pub created_at: DateTime<Utc>,
    #[schema(value_type = String, format = DateTime)]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetAgentsForPromptRequest {
    pub prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetAgentsForPromptResponse {
    pub agents: Vec<AgentDb>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetResponseFromAgentsRequest {
    pub agent_ids: Vec<i64>,
    pub prompt: String,
    pub tx_hashes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GetResponseFromAgentsResponse {
    pub agent_responses: Vec<AgentResponse>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct AgentResponse {
    pub agent_id: i64,
    pub prompt: String,
    pub response: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type, ToSchema)]
#[sqlx(type_name = "agent_category", rename_all = "PascalCase")]
pub enum AgentCategory {
    Web3,
    Financial,
    Analytics,
    Healthcare,
    IoT,
    Gaming,
    #[sqlx(rename = "Consumer Data")]
    ConsumerData,
    #[sqlx(rename = "Social Media")]
    SocialMedia,
    Environmental,
}

impl ToString for AgentCategory {
    fn to_string(&self) -> String {
        match self {
            AgentCategory::Web3 => "Web3".to_string(),
            AgentCategory::Financial => "Financial".to_string(),
            AgentCategory::Analytics => "Analytics".to_string(),
            AgentCategory::Healthcare => "Healthcare".to_string(),
            AgentCategory::IoT => "IoT".to_string(),
            AgentCategory::Gaming => "Gaming".to_string(),
            AgentCategory::ConsumerData => "Consumer Data".to_string(),
            AgentCategory::SocialMedia => "Social Media".to_string(),
            AgentCategory::Environmental => "Environmental".to_string(),
        }
    }
}

impl AgentCategory {
    pub fn from_string(category: &str) -> Option<AgentCategory> {
        match category {
            "Web3" => Some(AgentCategory::Web3),
            "Financial" => Some(AgentCategory::Financial),
            "Analytics" => Some(AgentCategory::Analytics),
            "Healthcare" => Some(AgentCategory::Healthcare),
            "IoT" => Some(AgentCategory::IoT),
            "Gaming" => Some(AgentCategory::Gaming),
            "Consumer Data" => Some(AgentCategory::ConsumerData),
            "Social Media" => Some(AgentCategory::SocialMedia),
            "Environmental" => Some(AgentCategory::Environmental),
            _ => None,
        }
    }
}

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
}

#[derive(Serialize, Deserialize, sqlx::FromRow, Debug)]
pub struct UserDb {
    pub id: i64,
    pub address: String,
}

#[derive(Debug, sqlx::FromRow)]
pub struct AgentDb {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub owner_id: i64,
    pub dataset_path: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

use std::path::Path;

use actix_multipart::Multipart;
use actix_web::{HttpResponse, Responder, get, post, web};
use futures_util::TryStreamExt;
use serde::Serialize;
use tracing::{error, info, warn};
use utoipa::ToSchema;
use uuid::Uuid;

// No longer needed: use crate::{state::AppState,};

#[derive(Serialize, ToSchema)]
pub struct CsvUploadResponse {
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

#[derive(ToSchema)]
pub struct FileUploadRequest {
    /// CSV file to upload
    #[schema(value_type = String, format = Binary)]
    pub file: Vec<u8>,
}

#[utoipa::path(
        responses(
            (status = 200, description = "Home page", body = String),
        )
    )]
#[get("/")]
async fn get_index_service() -> impl Responder {
    HttpResponse::Ok().body("UP")
}

#[utoipa::path(
    responses(
        (status = 200, description = "Health check", body = String),
    )
)]
#[get("/health")]
async fn get_health_service() -> impl Responder {
    HttpResponse::Ok().body("ok")
}

#[utoipa::path(
    post,
    path = "/upload-csv",
    request_body(
        content = FileUploadRequest,
        content_type = "multipart/form-data",
        description = "Upload a CSV file. The file should be sent as form data with the field name 'file'."
    ),
    responses(
        (status = 200, description = "CSV file uploaded successfully", body = CsvUploadResponse),
        (status = 400, description = "Bad request - invalid file or format", body = ErrorResponse),
        (status = 413, description = "File too large", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "File Upload"
)]
#[post("/upload-csv")]
async fn upload_csv_service(mut payload: Multipart) -> impl Responder {
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB
    const UPLOAD_DIR: &str = "./uploads";

    // Create uploads directory if it doesn't exist
    if let Err(e) = tokio::fs::create_dir_all(UPLOAD_DIR).await {
        error!("Failed to create upload directory: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Failed to create upload directory".to_string(),
            error_code: Some("DIRECTORY_CREATION_FAILED".to_string()),
        });
    }

    while let Some(mut field) = payload.try_next().await.unwrap_or(None) {
        let filename = field
            .content_disposition()
            .and_then(|cd| cd.get_filename().map(|s| s.to_string()));

        if let Some(filename) = filename {
            // Validate file extension
            if !filename.to_lowercase().ends_with(".csv") {
                return HttpResponse::BadRequest().json(ErrorResponse {
                    success: false,
                    message: "Only CSV files are allowed".to_string(),
                    error_code: Some("INVALID_FILE_TYPE".to_string()),
                });
            }

            // Generate unique file ID and path
            let file_id = Uuid::new_v4().to_string();
            let file_extension = Path::new(&filename) // Pass reference here
                .extension()
                .and_then(|ext| ext.to_str())
                .unwrap_or("csv");

            // remove the extension from the filename if it exists
            let filename_without_extension = Path::new(&filename)
                .file_stem()
                .and_then(|stem| stem.to_str())
                .unwrap_or(&filename);

            let unique_filename = format!(
                "{}_{}.{}",
                file_id, filename_without_extension, file_extension
            );
            let filepath = Path::new(UPLOAD_DIR).join(&unique_filename);

            // Create file and write data
            let mut file = match tokio::fs::File::create(&filepath).await {
                Ok(file) => file,
                Err(e) => {
                    error!("Failed to create file: {}", e);
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        success: false,
                        message: "Failed to create file".to_string(),
                        error_code: Some("FILE_CREATION_FAILED".to_string()),
                    });
                }
            };

            let mut file_size = 0u64;
            let mut file_data = Vec::new();

            // Read file data
            while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                file_size += chunk.len() as u64;

                // Check file size limit
                if file_size > MAX_FILE_SIZE as u64 {
                    // Clean up the file
                    let _ = tokio::fs::remove_file(&filepath).await;
                    return HttpResponse::PayloadTooLarge().json(ErrorResponse {
                        success: false,
                        message: format!(
                            "File too large. Maximum size is {} MB",
                            MAX_FILE_SIZE / (1024 * 1024)
                        ),
                        error_code: Some("FILE_TOO_LARGE".to_string()),
                    });
                }

                file_data.extend_from_slice(&chunk);

                if let Err(e) = tokio::io::AsyncWriteExt::write_all(&mut file, &chunk).await {
                    error!("Failed to write to file: {}", e);
                    let _ = tokio::fs::remove_file(&filepath).await;
                    return HttpResponse::InternalServerError().json(ErrorResponse {
                        success: false,
                        message: "Failed to write file".to_string(),
                        error_code: Some("FILE_WRITE_FAILED".to_string()),
                    });
                }
            }

            // Validate and count CSV rows
            let row_count = match validate_and_count_csv(&file_data) {
                Ok(count) => count,
                Err(e) => {
                    warn!("CSV validation failed: {}", e);
                    // Clean up the file
                    let _ = tokio::fs::remove_file(&filepath).await;
                    return HttpResponse::BadRequest().json(ErrorResponse {
                        success: false,
                        message: format!("Invalid CSV format: {}", e),
                        error_code: Some("INVALID_CSV_FORMAT".to_string()),
                    });
                }
            };

            info!(
                "CSV file uploaded successfully: {} ({} bytes, {} rows)",
                filename, file_size, row_count
            );

            return HttpResponse::Ok().json(CsvUploadResponse {
                success: true,
                message: "CSV file uploaded successfully".to_string(),
                file_id: Some(file_id),
                filename: Some(filename.to_string()),
                file_size: Some(file_size),
                row_count: Some(row_count),
            });
        }
    }

    HttpResponse::BadRequest().json(ErrorResponse {
        success: false,
        message: "No file found in the request".to_string(),
        error_code: Some("NO_FILE_FOUND".to_string()),
    })
}

fn validate_and_count_csv(data: &[u8]) -> Result<usize, String> {
    let content = String::from_utf8(data.to_vec())
        .map_err(|_| "File contains invalid UTF-8 characters".to_string())?;

    let mut reader = csv::Reader::from_reader(content.as_bytes());
    let mut row_count = 0;

    // Validate headers exist
    let _headers = reader
        .headers()
        .map_err(|e| format!("Failed to read CSV headers: {}", e))?;

    // Count and validate rows
    for result in reader.records() {
        match result {
            Ok(_) => row_count += 1,
            Err(e) => return Err(format!("Invalid CSV row: {}", e)),
        }
    }

    Ok(row_count)
}

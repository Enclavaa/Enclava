use std::path::Path;

use actix_multipart::Multipart;
use actix_web::{HttpResponse, Responder, post, web};
use futures_util::TryStreamExt;
use tracing::{debug, error, info, warn};

use uuid::Uuid;

use crate::{
    config::UPLOAD_DIR,
    database,
    helpers::{self, agents::init_ai_agent_with_dataset},
    state::AppState,
    types::{
        AgentCategory, DatasetDetailsGenerateRequest, DatasetDetailsGenerateResponse,
        DatasetMetadata, DatasetUploadRequest, DatasetUploadResponse, ErrorResponse, UserDb,
    },
};

#[utoipa::path(
    post,
    path = "/dataset/details/generate",
    request_body(
        content = DatasetDetailsGenerateRequest,
        content_type = "multipart/form-data",
        description = "Gnerate dataset details using AI(name, description, category). Send the CSV file as 'file'."
    ),
    responses(
        (status = 200, description = "Dataset Details generated successfully", body = DatasetDetailsGenerateResponse),
        (status = 400, description = "Bad request - invalid file or format", body = ErrorResponse),
        (status = 413, description = "File too large", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Data Management"
)]
#[post("/dataset/details/generate")]
async fn generate_dataset_details_service(
    app_state: web::Data<AppState>,
    mut payload: Multipart,
) -> impl Responder {
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB

    // Create uploads directory if it doesn't exist
    if let Err(e) = tokio::fs::create_dir_all(UPLOAD_DIR).await {
        error!("Failed to create upload directory: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Failed to create upload directory".to_string(),
            error_code: Some("DIRECTORY_CREATION_FAILED".to_string()),
        });
    }

    let mut file_data: Option<(String, Vec<u8>, u64)> = None; // (filename, data, size)

    while let Some(mut field) = payload.try_next().await.unwrap_or(None) {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
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

                    let mut file_size = 0u64;
                    let mut file_bytes = Vec::new();

                    // Read file data
                    while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                        file_size += chunk.len() as u64;

                        // Check file size limit
                        if file_size > MAX_FILE_SIZE as u64 {
                            return HttpResponse::PayloadTooLarge().json(ErrorResponse {
                                success: false,
                                message: format!(
                                    "File too large. Maximum size is {} MB",
                                    MAX_FILE_SIZE / (1024 * 1024)
                                ),
                                error_code: Some("FILE_TOO_LARGE".to_string()),
                            });
                        }

                        file_bytes.extend_from_slice(&chunk);
                    }

                    file_data = Some((filename, file_bytes, file_size));
                }
            }
            _ => {
                // Skip unknown fields
                while let Some(_chunk) = field.try_next().await.unwrap_or(None) {
                    // Just consume the field
                }
            }
        }
    }

    // Validate that both file and metadata were provided
    let (filename, file_bytes, file_size) = match file_data {
        Some(data) => data,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "No file found in the request".to_string(),
                error_code: Some("NO_FILE_FOUND".to_string()),
            });
        }
    };

    // Validate and count CSV rows
    let _row_count = match helpers::csv::validate_and_count_csv(&file_bytes) {
        Ok(count) => count,
        Err(e) => {
            warn!("CSV validation failed: {}", e);
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: format!("Invalid CSV format: {}", e),
                error_code: Some("INVALID_CSV_FORMAT".to_string()),
            });
        }
    };

    // Convert the Csv to plain Text
    let csv_text = match helpers::csv::csv_bytes_to_string(&file_bytes).await {
        Ok(text) => text,
        Err(e) => {
            warn!("CSV conversion failed: {}", e);
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: format!("Failed to convert CSV to string: {}", e),
                error_code: Some("CSV_CONVERSION_FAILED".to_string()),
            });
        }
    };

    // Generate teh dataset details using AI
    let dataset_details =
        match helpers::agents::generate_dataset_details(&csv_text, &app_state.ai_model).await {
            Ok(details) => details,
            Err(e) => {
                error!("Failed to generate dataset details: {}", e);
                return HttpResponse::InternalServerError().json(ErrorResponse {
                    success: false,
                    message: format!("Failed to generate dataset details: {}", e),
                    error_code: Some("DATASET_DETAILS_GENERATION_FAILED".to_string()),
                });
            }
        };

    HttpResponse::Ok().json(DatasetDetailsGenerateResponse {
        success: true,
        message: "Dataset details generated successfully".to_string(),
        name: dataset_details.name,
        description: dataset_details.description,
        category: dataset_details.category,
    })
}

#[utoipa::path(
    post,
    path = "/dataset/upload",
    request_body(
        content = DatasetUploadRequest,
        content_type = "multipart/form-data",
        description = "Upload your dataset with metadata. Send the CSV file as 'file' and individual metadata fields: user_address, dataset_price, description, and name."
    ),
    responses(
        (status = 200, description = "Dataset uploaded successfully", body = DatasetUploadResponse),
        (status = 400, description = "Bad request - invalid file or format", body = ErrorResponse),
        (status = 413, description = "File too large", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Data Management"
)]
#[post("/dataset/upload")]
pub async fn upload_dataset_service(
    app_state: web::Data<AppState>,
    mut payload: Multipart,
) -> impl Responder {
    const MAX_FILE_SIZE: usize = 10 * 1024 * 1024; // 10MB

    // Create uploads directory if it doesn't exist
    if let Err(e) = tokio::fs::create_dir_all(UPLOAD_DIR).await {
        error!("Failed to create upload directory: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Failed to create upload directory".to_string(),
            error_code: Some("DIRECTORY_CREATION_FAILED".to_string()),
        });
    }

    let mut file_data: Option<(String, Vec<u8>, u64)> = None; // (filename, data, size)
    let mut user_address: Option<String> = None;
    let mut dataset_price: Option<f64> = None;
    let mut description: Option<String> = None;
    let mut name: Option<String> = None;
    let mut category: Option<AgentCategory> = None;

    while let Some(mut field) = payload.try_next().await.unwrap_or(None) {
        let field_name = field.name().unwrap_or("").to_string();

        match field_name.as_str() {
            "file" => {
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

                    let mut file_size = 0u64;
                    let mut file_bytes = Vec::new();

                    // Read file data
                    while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                        file_size += chunk.len() as u64;

                        // Check file size limit
                        if file_size > MAX_FILE_SIZE as u64 {
                            return HttpResponse::PayloadTooLarge().json(ErrorResponse {
                                success: false,
                                message: format!(
                                    "File too large. Maximum size is {} MB",
                                    MAX_FILE_SIZE / (1024 * 1024)
                                ),
                                error_code: Some("FILE_TOO_LARGE".to_string()),
                            });
                        }

                        file_bytes.extend_from_slice(&chunk);
                    }

                    file_data = Some((filename, file_bytes, file_size));
                }
            }
            "user_address" => {
                let mut field_bytes = Vec::new();
                while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                    field_bytes.extend_from_slice(&chunk);
                }
                user_address = Some(String::from_utf8_lossy(&field_bytes).to_string());
            }
            "dataset_price" => {
                let mut field_bytes = Vec::new();
                while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                    field_bytes.extend_from_slice(&chunk);
                }
                let price_str = String::from_utf8_lossy(&field_bytes);
                dataset_price = match price_str.parse::<f64>() {
                    Ok(price) => Some(price),
                    Err(_) => {
                        return HttpResponse::BadRequest().json(ErrorResponse {
                            success: false,
                            message: "Invalid dataset_price. Must be a number (1 or 2)".to_string(),
                            error_code: Some("INVALID_DATASET_PRICE_FORMAT".to_string()),
                        });
                    }
                };
            }
            "description" => {
                let mut field_bytes = Vec::new();
                while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                    field_bytes.extend_from_slice(&chunk);
                }
                description = Some(String::from_utf8_lossy(&field_bytes).to_string());
            }
            "name" => {
                let mut field_bytes = Vec::new();
                while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                    field_bytes.extend_from_slice(&chunk);
                }
                name = Some(String::from_utf8_lossy(&field_bytes).to_string());
            }

            "category" => {
                let mut field_bytes = Vec::new();
                while let Some(chunk) = field.try_next().await.unwrap_or(None) {
                    field_bytes.extend_from_slice(&chunk);
                }

                category = match AgentCategory::from_string(&String::from_utf8_lossy(&field_bytes))
                {
                    Some(cat) => Some(cat),
                    None => {
                        return HttpResponse::BadRequest().json(ErrorResponse {
                            success: false,
                            message: "Invalid category.".to_string(),
                            error_code: Some("INVALID_CATEGORY".to_string()),
                        });
                    }
                };
            }
            _ => {
                // Skip unknown fields
                while let Some(_chunk) = field.try_next().await.unwrap_or(None) {
                    // Just consume the field
                }
            }
        }
    }

    // Validate that both file and metadata were provided
    let (filename, file_bytes, file_size) = match file_data {
        Some(data) => data,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "No file found in the request".to_string(),
                error_code: Some("NO_FILE_FOUND".to_string()),
            });
        }
    };

    // Validate all required fields are present
    let user_address = match user_address {
        Some(addr) => addr,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "user_address field is required".to_string(),
                error_code: Some("MISSING_USER_ADDRESS".to_string()),
            });
        }
    };

    let dataset_price = match dataset_price {
        Some(price) => price,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "dataset_price field is required".to_string(),
                error_code: Some("MISSING_DATASET_PRICE".to_string()),
            });
        }
    };

    let description = match description {
        Some(desc) => desc,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "description field is required".to_string(),
                error_code: Some("MISSING_DESCRIPTION".to_string()),
            });
        }
    };

    let name = match name {
        Some(n) => n,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "name field is required".to_string(),
                error_code: Some("MISSING_NAME".to_string()),
            });
        }
    };

    let category = match category {
        Some(cat) => cat,
        None => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "category field is required".to_string(),
                error_code: Some("MISSING_CATEGORY".to_string()),
            });
        }
    };

    // Create metadata object
    let metadata = DatasetMetadata {
        user_address: user_address.clone(),
        dataset_price,
        description: description.clone(),
        name: name.clone(),
        category: category.clone(),
    };

    // Validate and count CSV rows
    let row_count = match helpers::csv::validate_and_count_csv(&file_bytes) {
        Ok(count) => count,
        Err(e) => {
            warn!("CSV validation failed: {}", e);
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: format!("Invalid CSV format: {}", e),
                error_code: Some("INVALID_CSV_FORMAT".to_string()),
            });
        }
    };

    // Generate unique file ID and save file
    let file_id = Uuid::new_v4().to_string();
    let file_extension = Path::new(&filename)
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("csv");

    let filename_without_extension = Path::new(&filename)
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or(&filename);

    let unique_filename = format!(
        "{}_{}.{}",
        file_id, filename_without_extension, file_extension
    );
    let filepath = Path::new(UPLOAD_DIR).join(&unique_filename);

    // Save file to disk
    if let Err(e) = tokio::fs::write(&filepath, &file_bytes).await {
        error!("Failed to write file: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Failed to save file".to_string(),
            error_code: Some("FILE_SAVE_FAILED".to_string()),
        });
    }

    info!(
        "Dataset uploaded successfully: {} ({} bytes, {} rows) by user {}",
        filename, file_size, row_count, user_address
    );

    // Now save the dataset to the database

    let db = &app_state.db;

    let mut tx = match db.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            error!("Failed to start transaction: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to start database transaction".to_string(),
                error_code: Some("DB_TRANSACTION_FAILED".to_string()),
            });
        }
    };

    let user_op = match database::get_user_by_address(&mut tx, &user_address).await {
        Ok(user) => user,
        Err(e) => {
            error!("Failed to get user: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to get user at the first fetch".to_string(),
                error_code: Some("USER_FETCH_FAILED".to_string()),
            });
        }
    };

    debug!("User operation result: {:?}", user_op);

    let user: UserDb = if user_op.is_none() {
        // If user does not exist, insert them
        if let Err(e) = database::insert_user(&mut tx, &user_address).await {
            tx.rollback().await.ok(); // Rollback transaction on error

            error!("Failed to insert a new user: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to insert user".to_string(),
                error_code: Some("USER_INSERT_FAILED".to_string()),
            });
        }

        let user_ret = match database::get_user_by_address(&mut tx, &user_address).await {
            Ok(user) => user,
            Err(e) => {
                error!("Failed to get user: {}", e);
                return HttpResponse::InternalServerError().json(ErrorResponse {
                    success: false,
                    message: "Failed to get user".to_string(),
                    error_code: Some("USER_FETCH_FAILED".to_string()),
                });
            }
        };

        if user_ret.is_none() {
            // throw an error
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to get user".to_string(),
                error_code: Some("USER_FETCH_FAILED".to_string()),
            });
        }

        user_ret.unwrap()
    } else {
        user_op.unwrap()
    };

    let dataset_path = unique_filename;

    // Insert a new agent
    let agent_db = match database::insert_new_agent(
        &mut tx,
        &name,
        &description,
        dataset_price,
        user.id,
        &dataset_path,
        &category,
        file_size as f64,
    )
    .await
    {
        Ok(agent) => agent,
        Err(e) => {
            error!("Failed to insert agent: {}", e);

            tx.rollback().await.ok(); // Rollback transaction on error

            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to insert agent".to_string(),
                error_code: Some("AGENT_INSERT_FAILED".to_string()),
            });
        }
    };

    // Implement training new ai agent using rag with gemini using rig-core
    if let Err(e) = init_ai_agent_with_dataset(&user, &agent_db, &filepath, &app_state).await {
        error!("Failed to initialize AI agent with dataset: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: format!("Failed to initialize AI agent with dataset: {}", e),
            error_code: Some("AGENT_INIT_FAILED".to_string()),
        });
    };

    // Commit the transaction
    if let Err(e) = tx.commit().await {
        error!("Failed to commit transaction: {}", e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Failed to commit database transaction".to_string(),
            error_code: Some("DB_COMMIT_FAILED".to_string()),
        });
    }

    HttpResponse::Ok().json(DatasetUploadResponse {
        success: true,
        message: "Dataset uploaded and AI agent initialized successfully".to_string(),
        file_id: Some(file_id),
        filename: Some(filename),
        file_size: Some(file_size),
        row_count: Some(row_count),
        metadata: Some(metadata),
        dataset_id: agent_db.id,
    })
}

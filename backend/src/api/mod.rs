use std::path::{Path, PathBuf};

use actix_multipart::Multipart;
use actix_web::{HttpResponse, Responder, get, post, web};
use futures_util::TryStreamExt;
use rig::{
    client::ProviderClient,
    completion::Prompt,
    providers::gemini::{
        self,
        completion::{GEMINI_2_0_FLASH_LITE, GEMINI_2_5_FLASH_PREVIEW_05_20},
    },
};
use tracing::{debug, error, info, warn};

use uuid::Uuid;

use crate::{
    config::{ROUTER_AGENT_MODEL, UPLOAD_DIR},
    database,
    helpers::{self, agents::init_ai_agent_with_dataset},
    state::AppState,
    types::{
        AgentCategory, AgentDb, AgentQueryParams, AgentQueryResult, AgentResponse, DatasetMetadata,
        DatasetUploadRequest, DatasetUploadResponse, ErrorResponse, GetAgentsForPromptRequest,
        GetAgentsForPromptResponse, GetResponseFromAgentsRequest, GetResponseFromAgentsResponse,
        UserDb, DatasetStatsResponse,
    },
};

#[utoipa::path(
        responses(
            (status = 200, description = "Home page", body = String),
        ),
        tag = "Health"
    )]
#[get("/")]
async fn get_index_service() -> impl Responder {
    HttpResponse::Ok().body("UP")
}

#[utoipa::path(
    responses(
        (status = 200, description = "Health check", body = String),
    ),
    tag = "Health"
)]
#[get("/health")]
async fn get_health_service() -> impl Responder {
    HttpResponse::Ok().body("ok")
}

#[utoipa::path(
    get,
    path = "/agents",
    params(
        ("search" = Option<String>, Query, description = "Search agents by name (case-insensitive partial match)"),
        ("category" = Option<AgentCategory>, Query, description = "Filter agents by category"),
        ("status" = Option<String>, Query, description = "Filter agents by status"),
        ("sort_by" = Option<String>, Query, description = "Sort field: price, created_at, updated_at, name"),
        ("sort_order" = Option<String>, Query, description = "Sort order: asc or desc (default: asc)")
    ),
    responses(
        (status = 200, description = "Agents fetched successfully", body = Vec<AgentDb>),
        (status = 400, description = "Bad request - invalid parameters", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Agents"
)]
#[get("/agents")]
async fn get_all_agents_service(
    app_state: web::Data<AppState>,
    query: web::Query<AgentQueryParams>,
) -> impl Responder {
    let db = &app_state.db;

    // Validate sort_by field
    let sort_by = query.sort_by.as_deref().unwrap_or("created_at");
    let valid_sort_fields = ["price", "created_at", "updated_at", "name"];
    if !valid_sort_fields.contains(&sort_by) {
        return HttpResponse::BadRequest().json(ErrorResponse {
            success: false,
            message: format!(
                "Invalid sort_by field: {}. Valid options: {}",
                sort_by,
                valid_sort_fields.join(", ")
            ),
            error_code: Some("INVALID_SORT_FIELD".to_string()),
        });
    }

    // Validate sort_order
    let sort_order = query.sort_order.as_deref().unwrap_or("asc");
    let sort_order = match sort_order.to_lowercase().as_str() {
        "asc" => "ASC",
        "desc" => "DESC",
        _ => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                success: false,
                message: "Invalid sort_order. Must be 'asc' or 'desc'".to_string(),
                error_code: Some("INVALID_SORT_ORDER".to_string()),
            });
        }
    };

    // Start with base query
    let mut sql = String::from(
        r#"SELECT
        id,
        name,
        description,
        price,
        owner_id,
        dataset_path,
        category,
        dataset_size,
        status,
        created_at,
        updated_at
     FROM agents WHERE 1=1"#,
    );

    let mut param_count = 0;

    // Add search condition
    if let Some(search) = &query.search {
        if !search.trim().is_empty() {
            param_count += 1;
            sql.push_str(&format!(" AND name ILIKE ${}", param_count));
        }
    }

    // Add category filter
    if let Some(category) = &query.category {
        param_count += 1;
        sql.push_str(&format!(" AND category::text = ${}", param_count));
    }

    // Add status filter
    if let Some(status) = &query.status {
        if !status.trim().is_empty() {
            param_count += 1;
            sql.push_str(&format!(" AND status = ${}", param_count));
        }
    }

    // Add ORDER BY clause
    sql.push_str(&format!(" ORDER BY {} {}", sort_by, sort_order));

    // Execute the query
    let mut query_builder = sqlx::query_as::<_, AgentQueryResult>(&sql);

    if let Some(search) = &query.search {
        if !search.trim().is_empty() {
            query_builder = query_builder.bind(format!("%{}%", search.trim()));
        }
    }

    if let Some(category) = &query.category {
        query_builder = query_builder.bind(category.to_string());
    }

    if let Some(status) = &query.status {
        if !status.trim().is_empty() {
            query_builder = query_builder.bind(status.trim().to_string());
        }
    }

    let query_results = match query_builder.fetch_all(db).await {
        Ok(results) => results,
        Err(e) => {
            error!("Failed to get agents: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Failed to get agents from database: {}", e),
                error_code: Some("AGENT_FETCH_FAILED".to_string()),
            });
        }
    };

    // Convert to AgentDb format
    let agents: Vec<AgentDb> = query_results
        .into_iter()
        .map(|result| AgentDb {
            id: result.id,
            name: result.name,
            description: result.description,
            price: result.price,
            owner_id: result.owner_id,
            dataset_path: result.dataset_path,
            category: result.category,
            dataset_size: result.dataset_size,
            status: result.status,
            created_at: result.created_at,
            updated_at: result.updated_at,
        })
        .collect();

    HttpResponse::Ok().json(agents)
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
async fn upload_dataset_service(
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
    })
}

/*
Endpoint that its job is to get all the agents from database and using gemini ai(rig-core) that will return the ids of the agents that have the response for the prompt.
*/
#[utoipa::path(
    post,
    path = "/chat/agents",
    request_body(
        content = GetAgentsForPromptRequest,
        content_type = "application/json",
        description = "User prompt to get agents that can respond to it"
    ),
    responses(
        (status = 200, description = "Agents fetched successfully", body = String),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Agents"
)]
#[post("/chat/agents")]
async fn get_agents_for_prompt_service(
    app_state: web::Data<AppState>,
    body: web::Json<GetAgentsForPromptRequest>,
) -> HttpResponse {
    let user_prompt = body.prompt.trim();

    // Get the List of agents from database
    let db = &app_state.db;

    let agents = match sqlx::query_as!(
        AgentDb,
        r#"SELECT 
        id,
        name,
        description,
        price,
        owner_id,
        dataset_path,
        category as "category: AgentCategory",
        dataset_size,
        status,
        created_at,
        updated_at
     FROM agents"#
    )
    .fetch_all(db)
    .await
    {
        Ok(agents) => agents,
        Err(e) => {
            error!("Failed to get agents: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to get agents from database".to_string(),
                error_code: Some("AGENT_FETCH_FAILED".to_string()),
            });
        }
    };

    let agents_vec_str: String = agents
        .iter()
        .map(|agent| {
            format!(
                "{{\"id\":{},\"name\":\"{}\",\"description\":\"{}\", \"category\":\"{}\"}}",
                agent.id,
                agent.name,
                agent.description,
                agent.category.to_string()
            )
        })
        .collect::<Vec<_>>()
        .join(", ");

    let model = gemini::Client::from_env();
    let ai = model
        .agent(ROUTER_AGENT_MODEL)
        .preamble("You are an AI agent that your main and only task is to return the agents ids that can respond to the user question. You decide wether to return an agent id by using their available description, name and category. You' ll find this data in your context. Remeber to always only return the response as an array of agents id.If you can't find anyone just return an empty array. Exemple of response : [5, 9]. ")
        .temperature(0.0)
        .build();

    let prompt = format!(
        "User question: {}. Please return the agents ids that can respond to this question. This is all the agents: [{}]",
        user_prompt, agents_vec_str
    );

    let response = match ai.prompt(prompt).await {
        Ok(response) => response,
        Err(e) => {
            error!("Failed to get AI response: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Failed to get AI response: {}", e),
                error_code: Some("AI_RESPONSE_FAILED".to_string()),
            });
        }
    };

    debug!("AI response: {}", response);

    // remove any markdown
    let formatted_response = response.replace("```", "");

    debug!("Formatted AI response: {}", formatted_response);

    let agents_id_vec = match serde_json::from_str::<Vec<i64>>(&formatted_response) {
        Ok(vec) => vec,
        Err(e) => {
            error!("Failed to parse AI response: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Failed to parse AI response: {}", e),
                error_code: Some("AI_RESPONSE_PARSE_FAILED".to_string()),
            });
        }
    };

    if agents_id_vec.is_empty() {
        return HttpResponse::Ok().json(GetAgentsForPromptResponse { agents: Vec::new() });
    }

    // Filter agents to only include those whose IDs are in agents_id_vec
    let available_agents: Vec<AgentDb> = agents
        .into_iter()
        .filter(|agent| agents_id_vec.contains(&agent.id))
        .collect();

    HttpResponse::Ok().json(GetAgentsForPromptResponse {
        agents: available_agents,
    })
}

/*
Endpoint that will use specifid agents ids by user and will return the response from the agents specified.
*/
#[utoipa::path(
    post,
    path = "/chat/agents/answer", 
    request_body(
        content = GetResponseFromAgentsRequest,
        content_type = "application/json",
        description = "User prompt and specified agents ids to get response from and tx hashes to verify payment."
    ),
    responses(
        (status = 200, description = "Agents responses fetched successfully", body = GetResponseFromAgentsResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Agents"
)]
#[post("/chat/agents/answer")]
async fn get_response_from_agents_service(
    app_state: web::Data<AppState>,
    body: web::Json<GetResponseFromAgentsRequest>,
) -> HttpResponse {
    let agent_ids = &body.agent_ids;
    let prompt = &body.prompt;
    let _tx_hashes = &body.tx_hashes;

    let mut agent_responses = Vec::new();

    // TODO: verify payment using tx hashes

    // Get response from each agent specified
    for agent_id in agent_ids {
        let agent = app_state.tee_agents.get(agent_id);

        if agent.is_none() {
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Agent with id {} not running", agent_id),
                error_code: Some("AGENT_NOT_FOUND".to_string()),
            });
        }

        let agent = agent.unwrap();

        let response = match agent.prompt(prompt).await {
            Ok(response) => response,
            Err(e) => {
                error!("Failed to get AI response: {}", e);
                return HttpResponse::InternalServerError().json(ErrorResponse {
                    success: false,
                    message: format!(
                        "Failed to get AI response from agent with id {} : {}",
                        agent_id, e
                    ),
                    error_code: Some("AI_RESPONSE_FAILED".to_string()),
                });
            }
        };

        let agent_response = AgentResponse {
            agent_id: *agent_id,
            prompt: prompt.clone(),
            response,
        };

        agent_responses.push(agent_response);
    }

    HttpResponse::Ok().json(GetResponseFromAgentsResponse {
        agent_responses,
        success: true,
    })
}

#[utoipa::path(
    get,
    path = "/datasets/stats",
    responses(
        (status = 200, description = "Dataset statistics retrieved successfully", body = DatasetStatsResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Data Management"
)]
#[get("/datasets/stats")]
async fn get_datasets_stats_service(app_state: web::Data<AppState>) -> impl Responder {
    let db = &app_state.db;

    // Query to get total count and total price of all datasets (agents)
    let stats = match sqlx::query!(
        r#"
        SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(price), 0.0) as total_price
        FROM agents
        "#
    )
    .fetch_one(db)
    .await
    {
        Ok(stats) => stats,
        Err(e) => {
            error!("Failed to get dataset statistics: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to retrieve dataset statistics from database".to_string(),
                error_code: Some("STATS_FETCH_FAILED".to_string()),
            });
        }
    };

    HttpResponse::Ok().json(DatasetStatsResponse {
        success: true,
        total_count: stats.total_count.unwrap_or(0),
        total_price: stats.total_price.unwrap_or(0.0),
    })
}

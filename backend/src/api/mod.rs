pub mod dataset;
pub mod profile;

use crate::{
    config::{MAX_ALLOWED_SELECTED_AGENTS, ROUTER_AGENT_MODEL},
    database, helpers,
    state::AppState,
    tee,
    types::{
        AgentCategory, AgentDb, AgentQueryParams, AgentQueryResult, AgentResponse,
        DatasetStatsResponse, ErrorResponse, GetAgentsForPromptRequest, GetAgentsForPromptResponse,
        GetResponseFromAgentsRequest, GetResponseFromAgentsResponse,
    },
};
use actix_web::{HttpResponse, Responder, get, post, web};
use rig::{
    client::ProviderClient,
    completion::Prompt,
    providers::gemini::{self},
};
use tracing::{debug, error, info, warn};

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
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.category,
        g.dataset_size,
        g.status,
        g.created_at,
        g.updated_at,
        g.nft_id,
        g.nft_tx, 
        u.address
     FROM agents g
     JOIN users u ON g.owner_id = u.id WHERE 1=1"#,
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
            owner_address: result.address,
            nft_id: result.nft_id,
            nft_tx: result.nft_tx,
        })
        .collect();

    HttpResponse::Ok().json(agents)
}

#[utoipa::path(
    get,
    path = "/agents/{id}",
    params(
        ("id" = i64, Path, description = "Agent id")
    ),
    responses(
        (status = 200, description = "Agent fetched successfully", body = AgentDb),
        (status = 404, description = "Agent not found", body = ErrorResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "Agents"
)]
#[get("/agents/{id}")]
async fn get_agent_by_id_service(
    app_state: web::Data<AppState>,
    path: web::Path<i64>,
) -> impl Responder {
    let agent_id = path.into_inner();

    let db = &app_state.db;

    let agent_db = match database::get_agent_by_id(db, agent_id).await {
        Ok(agent) => agent,
        Err(e) => {
            error!("Failed to get agent: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Failed to get agent from database: {}", e),
                error_code: Some("AGENT_FETCH_FAILED".to_string()),
            });
        }
    };

    HttpResponse::Ok().json(agent_db)
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
        g.id,
        g.name,
        g.description,
        g.price,
        g.owner_id,
        g.dataset_path,
        g.status,
        g.category as "category: AgentCategory",
        g.dataset_size,
        g.created_at,
        g.updated_at,
        g.nft_id,
        g.nft_tx, 
        u.address as "owner_address: String"
    FROM agents g
    JOIN users u ON g.owner_id = u.id"#
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
    let tx_hash = &body.tx_hash;

    if tx_hash.is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            success: false,
            message: "No tx hash specified".to_string(),
            error_code: Some("NO_TX_HASH_SPECIFIED".to_string()),
        });
    }

    if prompt.is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            success: false,
            message: "No prompt specified".to_string(),
            error_code: Some("NO_PROMPT_SPECIFIED".to_string()),
        });
    }

    if agent_ids.is_empty() {
        return HttpResponse::BadRequest().json(ErrorResponse {
            success: false,
            message: "No agents specified".to_string(),
            error_code: Some("NO_AGENTS_SPECIFIED".to_string()),
        });
    }

    if agent_ids.len() > MAX_ALLOWED_SELECTED_AGENTS {
        return HttpResponse::BadRequest().json(ErrorResponse {
            success: false,
            message: "Too many agents specified".to_string(),
            error_code: Some("TOO_MANY_AGENTS_SPECIFIED".to_string()),
        });
    }

    let mut agent_responses = Vec::new();

    // Verify payment using tx hash
    let pay_sucess = match helpers::agents::verif_selected_agents_payment(
        &app_state, agent_ids, tx_hash,
    )
    .await
    {
        Ok(success) => success,
        Err(e) => {
            error!("Failed to verify payment: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: format!("Failed to verify payment: {}", e),
                error_code: Some("PAYMENT_VERIFICATION_FAILED".to_string()),
            });
        }
    };

    if !pay_sucess {
        return HttpResponse::InternalServerError().json(ErrorResponse {
            success: false,
            message: "Payment verification failed".to_string(),
            error_code: Some("PAYMENT_VERIFICATION_FAILED".to_string()),
        });
    }

    // Get response from each agent specified
    for agent_id in agent_ids {
        tee::call_tee_ai_agent(&app_state, *agent_id, &prompt).await;

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
            COALESCE(SUM(price), 0.0) as total_price,
            COALESCE(SUM(dataset_size), 0.0) as total_size
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
        total_size: stats.total_size.unwrap_or(0.0),
    })
}

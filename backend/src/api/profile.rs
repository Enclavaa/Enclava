use actix_web::{HttpResponse, Responder, get, web};

use crate::{
    database,
    state::AppState,
    types::{ErrorResponse, ProfileResponse},
};

#[utoipa::path(
    get,
    path = "/users/{address}/profile",
    params(
        ("address" = String, Path, description = "User address")
    ),
    responses(
        (status = 200, description = "User profile retrieved successfully", body = ProfileResponse),
        (status = 500, description = "Internal server error", body = ErrorResponse)
    ),
    tag = "User"
)]
#[get("/users/{address}/profile")]
async fn get_profile_service(
    app_state: web::Data<AppState>,
    path: web::Path<String>,
) -> impl Responder {
    let user_address = path.into_inner();

    let db = &app_state.db;

    // Get Agents by user address
    let agents_db = match database::get_agents_by_user_address(db, &user_address).await {
        Ok(agents) => agents,
        Err(e) => {
            tracing::error!("Failed to get agents: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                success: false,
                message: "Failed to get agents from database".to_string(),
                error_code: Some("AGENT_FETCH_FAILED".to_string()),
            });
        }
    };

    HttpResponse::Ok().json(ProfileResponse {
        sucess: true,
        message: "User profile retrieved successfully".to_string(),
        agents: agents_db,
    })
}

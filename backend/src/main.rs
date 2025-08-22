mod api;
mod config;
mod database;
mod fetcher;
mod helpers;
mod state;
mod tee;
mod types;

use actix_cors::Cors;
use actix_web::{App, HttpServer, web};

use tracing::{error, info};
use tracing_subscriber::{EnvFilter, fmt, layer::SubscriberExt, util::SubscriberInitExt};
use utoipa_actix_web::AppExt;
use utoipa_swagger_ui::SwaggerUi;

use crate::{config::APP_CONFIG, state::AppState};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    color_eyre::install().expect("Failed to install color_eyre");

    // Initialize the logger logic
    let file_appender = tracing_appender::rolling::daily("./logs", "enclava_backend.log");
    let (file_writer, _guard) = tracing_appender::non_blocking(file_appender);

    // Console writer (stdout)
    let console_layer = fmt::layer().pretty(); // Optional: makes console output prettier

    // File layer
    let file_layer = fmt::layer().with_writer(file_writer).with_ansi(false); // don't add colors to the file logs

    // 🔥 Only accept logs that match your crate
    let filter = EnvFilter::new("enclava_backend=trace");

    // Combine both
    tracing_subscriber::registry()
        .with(filter)
        .with(console_layer)
        .with(file_layer)
        .init();

    info!("Logger initialized Successfully");

    // Initialize a new application state
    let app_state = web::Data::new(AppState::new().await);

    // Starting all enclava fetchers
    fetcher::open_all_logs_fetcher(&app_state)
        .await
        .map_err(|e| {
            error!("Failed to start fetchers: {:?}", e);
            std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Enclava Fetcher error: {:?}", e),
            )
        })?;

    let port = APP_CONFIG.port;

    // Start the http server
    info!("Starting Http Server at http://127.0.0.1:{}", port);
    info!(
        "Starting SWAGGER Server at http://127.0.0.1:{}/swagger-ui/",
        port
    );

    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();

        let (app, app_api) = App::new()
            .wrap(cors)
            .into_utoipa_app()
            .app_data(web::Data::clone(&app_state))
            .service(api::get_index_service)
            .service(api::get_health_service)
            .service(api::dataset::upload_dataset_service)
            .service(api::dataset::generate_dataset_details_service)
            .service(api::get_all_agents_service)
            .service(api::get_agents_for_prompt_service)
            .service(api::get_response_from_agents_service)
            .service(api::get_datasets_stats_service)
            .service(api::profile::get_profile_service)
            .service(api::get_agent_by_id_service)
            .split_for_parts();

        app.service(SwaggerUi::new("/swagger-ui/{_:.*}").url("/api-docs/openapi.json", app_api))
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}

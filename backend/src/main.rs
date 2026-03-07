mod errors;
mod middleware;
mod models;
mod routes;
mod services;

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use axum::{middleware as axum_middleware, routing::get, Json, Router};
use serde_json::{json, Value};
use tower_governor::{governor::GovernorConfigBuilder, key_extractor::SmartIpKeyExtractor, GovernorLayer};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use services::civic_api::CivicApiClient;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=warn".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let civic_client = Arc::new(
        CivicApiClient::new()
            .expect("Failed to initialize CivicApiClient: GOOGLE_CIVIC_API_KEY must be set"),
    );

    let cors = CorsLayer::new()
        .allow_origin(
            "http://localhost:3000"
                .parse::<axum::http::HeaderValue>()
                .unwrap(),
        )
        .allow_methods(Any)
        .allow_headers(Any);

    // 30 requests per minute per IP (1 token per 2 seconds, burst of 30)
    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .key_extractor(SmartIpKeyExtractor)
            .period(Duration::from_secs(2))
            .burst_size(30)
            .use_headers()
            .finish()
            .unwrap(),
    );

    let api_routes = Router::new()
        .route("/api/voter-info", get(routes::elections::get_voter_info))
        .route("/api/elections", get(routes::elections::get_elections))
        .route("/api/all-elections", get(routes::elections::list_all_elections))
        .layer(GovernorLayer { config: governor_conf })
        .with_state(civic_client);

    let app = Router::new()
        .route("/health", get(health))
        .merge(api_routes)
        .layer(axum_middleware::from_fn(middleware::log_request))
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    tracing::info!("Listening on {addr}");

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

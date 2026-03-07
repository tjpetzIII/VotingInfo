pub mod errors;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod services;

use std::sync::Arc;

use axum::{routing::get, Json, Router};
use serde_json::{json, Value};

use services::civic_api::CivicApiClient;

pub async fn health_handler() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// Builds the application router with all routes and state, without middleware layers.
/// Used by tests; production `main` wraps this with CORS, rate-limiting, and logging.
pub fn build_app_router(client: Arc<CivicApiClient>) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/api/voter-info", get(routes::elections::get_voter_info))
        .route("/api/elections", get(routes::elections::get_elections))
        .route("/api/all-elections", get(routes::elections::list_all_elections))
        .with_state(client)
}

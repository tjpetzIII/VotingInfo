pub mod errors;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod services;

use std::sync::Arc;

use axum::{extract::FromRef, routing::get, Json, Router};
use serde_json::{json, Value};

use services::{civic_api::CivicApiClient, supabase::SupabaseClient};

/// Shared application state.
#[derive(Clone)]
pub struct AppState {
    pub civic: Arc<CivicApiClient>,
    pub supabase: Arc<SupabaseClient>,
}

impl AppState {
    pub fn new(civic: Arc<CivicApiClient>) -> Self {
        Self {
            civic,
            supabase: Arc::new(SupabaseClient::new()),
        }
    }
}

// Allow individual handlers to extract just the part they need.
impl FromRef<AppState> for Arc<CivicApiClient> {
    fn from_ref(state: &AppState) -> Self {
        state.civic.clone()
    }
}

impl FromRef<AppState> for Arc<SupabaseClient> {
    fn from_ref(state: &AppState) -> Self {
        state.supabase.clone()
    }
}

pub async fn health_handler() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

/// Builds the application router with all routes and state, without middleware layers.
/// Used by tests; production `main` wraps this with CORS, rate-limiting, and logging.
pub fn build_app_router(client: Arc<CivicApiClient>) -> Router {
    let state = AppState::new(client);
    Router::new()
        .route("/health", get(health_handler))
        .route("/api/voter-info", get(routes::elections::get_voter_info))
        .route("/api/elections", get(routes::elections::get_elections))
        .route("/api/all-elections", get(routes::elections::list_all_elections))
        .route("/api/registration", get(routes::elections::get_registration))
        .route("/api/scrape/pa", axum::routing::post(routes::scraper::scrape_pa))
        .route("/api/pa-elections", get(routes::scraper::get_pa_data))
        .with_state(state)
}

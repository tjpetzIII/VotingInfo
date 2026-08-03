pub mod errors;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod services;

use std::sync::Arc;

use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};

use services::{civic_api::CivicApiClient, scraper_utils::STATE_SCRAPERS, supabase::SupabaseClient};

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

/// The `/health` route, kept separate from `api_router` so callers can layer
/// rate-limiting onto `/api/*` only, matching production behavior.
pub fn health_router() -> Router<AppState> {
    Router::new().route("/health", get(health_handler))
}

/// All `/api/*` routes. Single source of truth shared by `build_app_router`
/// (tests) and `main` (production, which adds CORS/governor/logging layers).
///
/// The `/api/scrape/{state}` and `/api/{state}-elections` routes are
/// generated from `scraper_utils::STATE_SCRAPERS` rather than hand-written
/// per state — adding a state to that registry is enough to wire its routes.
pub fn api_router() -> Router<AppState> {
    let mut router = Router::new()
        .route("/api/voter-info", get(routes::elections::get_voter_info))
        .route("/api/elections", get(routes::elections::get_elections))
        .route("/api/ballot", get(routes::elections::get_ballot))
        .route("/api/all-elections", get(routes::elections::list_all_elections))
        .route("/api/registration", get(routes::elections::get_registration))
        .route("/api/elections/dates", get(routes::elections::get_election_dates));

    for config in STATE_SCRAPERS {
        let lower = config.lower();

        router = router
            .route(
                &format!("/api/scrape/{lower}"),
                axum::routing::post(move |State(supabase): State<Arc<SupabaseClient>>| async move {
                    routes::scraper::scrape_state(supabase, config).await
                }),
            )
            .route(
                &format!("/api/{lower}-elections"),
                get(move |State(supabase): State<Arc<SupabaseClient>>| async move {
                    routes::scraper::get_state_data(supabase, config).await
                }),
            );
    }

    router
}

/// Builds the application router with all routes and state, without middleware layers.
/// Used by tests; production `main` wraps `api_router`/`health_router` with CORS,
/// rate-limiting, and logging instead.
pub fn build_app_router(client: Arc<CivicApiClient>) -> Router {
    let state = AppState::new(client);
    health_router()
        .merge(api_router())
        .with_state(state)
}

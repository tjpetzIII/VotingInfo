use axum::Json;
use std::sync::Arc;

use crate::{
    errors::AppError,
    models::{ScrapeResult, StateDataResponse, StateElection, StateImportantDate},
    services::{scraper_utils::StateScraperConfig, supabase::SupabaseClient},
};

/// POST /api/scrape/{state}
///
/// Fetches `config`'s state elections page(s), parses elections and important
/// dates, and upserts both into Supabase. Returns a summary of how many
/// records were saved. Shared by every state registered in
/// `scraper_utils::STATE_SCRAPERS`.
pub async fn scrape_state(
    supabase: Arc<SupabaseClient>,
    config: &'static StateScraperConfig,
) -> Result<Json<ScrapeResult>, AppError> {
    let http = reqwest::Client::new();
    let data = (config.scrape)(&http).await?;

    let elections_saved = data.elections.len();
    let dates_saved = data.important_dates.len();

    supabase
        .upsert(&config.elections_table(), "election_date,election_type", &data.elections)
        .await?;
    supabase
        .upsert(
            &config.dates_table(),
            "event_date,event_description,election_year",
            &data.important_dates,
        )
        .await?;

    tracing::info!(
        state = config.state_code,
        elections = elections_saved,
        dates = dates_saved,
        "scrape completed"
    );

    Ok(Json(ScrapeResult { elections_saved, dates_saved }))
}

/// GET /api/{state}-elections
///
/// Returns all elections and important dates stored in Supabase for `config`'s
/// state. Shared by every state registered in `scraper_utils::STATE_SCRAPERS`.
pub async fn get_state_data(
    supabase: Arc<SupabaseClient>,
    config: &'static StateScraperConfig,
) -> Result<Json<StateDataResponse>, AppError> {
    let elections: Vec<StateElection> = supabase
        .fetch_all(&config.elections_table(), Some("election_date.asc"))
        .await?;
    let important_dates: Vec<StateImportantDate> =
        supabase.fetch_all(&config.dates_table(), None).await?;

    Ok(Json(StateDataResponse { elections, important_dates }))
}

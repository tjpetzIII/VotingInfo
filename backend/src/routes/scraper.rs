use axum::{extract::State, Json};
use std::sync::Arc;

use crate::{
    errors::AppError,
    models::{PaElection, PaImportantDate, PaStateDataResponse, ScrapeResult},
    services::{pa_scraper, supabase::SupabaseClient},
};

/// POST /api/scrape/pa
///
/// Fetches the PA upcoming-elections page, parses elections and important dates,
/// and upserts both into Supabase.  Returns a summary of how many records were saved.
pub async fn scrape_pa(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<ScrapeResult>, AppError> {
    let http = reqwest::Client::new();
    let data = pa_scraper::scrape(&http).await?;

    let elections_saved = data.elections.len();
    let dates_saved = data.important_dates.len();

    supabase.upsert("pa_elections", &data.elections).await?;
    supabase.upsert("pa_election_dates", &data.important_dates).await?;

    tracing::info!(
        elections = elections_saved,
        dates = dates_saved,
        "PA scrape completed"
    );

    Ok(Json(ScrapeResult { elections_saved, dates_saved }))
}

/// GET /api/pa-elections
///
/// Returns all PA elections and important dates stored in Supabase.
pub async fn get_pa_data(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<PaStateDataResponse>, AppError> {
    let elections: Vec<PaElection> = supabase
        .fetch_all("pa_elections", Some("election_date.asc"))
        .await?;
    let important_dates: Vec<PaImportantDate> = supabase
        .fetch_all("pa_election_dates", None)
        .await?;

    Ok(Json(PaStateDataResponse { elections, important_dates }))
}

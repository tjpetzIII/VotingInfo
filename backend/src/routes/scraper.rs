use axum::{extract::State, Json};
use std::sync::Arc;

use crate::{
    errors::AppError,
    models::{
        AkElection, AkImportantDate, AkStateDataResponse, AlElection, AlImportantDate,
        AlStateDataResponse, PaElection, PaImportantDate, PaStateDataResponse, ScrapeResult,
    },
    services::{ak_scraper, al_scraper, pa_scraper, supabase::SupabaseClient},
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

    supabase.upsert("pa_elections", "election_date,election_type", &data.elections).await?;
    supabase.upsert("pa_election_dates", "event_date,event_description,election_year", &data.important_dates).await?;

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

/// POST /api/scrape/al
///
/// Fetches the Alabama upcoming-elections page, parses statewide and local
/// elections, and upserts both into Supabase. Returns a summary of how many
/// records were saved.
pub async fn scrape_al(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<ScrapeResult>, AppError> {
    let http = reqwest::Client::new();
    let data = al_scraper::scrape(&http).await?;

    let elections_saved = data.elections.len();
    let dates_saved = data.important_dates.len();

    supabase.upsert("al_elections", "election_date,election_type", &data.elections).await?;
    supabase.upsert("al_election_dates", "event_date,event_description,election_year", &data.important_dates).await?;

    tracing::info!(
        elections = elections_saved,
        dates = dates_saved,
        "AL scrape completed"
    );

    Ok(Json(ScrapeResult { elections_saved, dates_saved }))
}

/// POST /api/scrape/ak
///
/// Fetches the Alaska election-information and calendar pages, parses upcoming
/// elections and calendar dates, and upserts both into Supabase. Returns a
/// summary of how many records were saved.
pub async fn scrape_ak(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<ScrapeResult>, AppError> {
    let http = reqwest::Client::new();
    let data = ak_scraper::scrape(&http).await?;

    let elections_saved = data.elections.len();
    let dates_saved = data.important_dates.len();

    supabase.upsert("ak_elections", "election_date,election_type", &data.elections).await?;
    supabase.upsert("ak_election_dates", "event_date,event_description,election_year", &data.important_dates).await?;

    tracing::info!(
        elections = elections_saved,
        dates = dates_saved,
        "AK scrape completed"
    );

    Ok(Json(ScrapeResult { elections_saved, dates_saved }))
}

/// GET /api/ak-elections
///
/// Returns all Alaska elections and calendar dates stored in Supabase.
pub async fn get_ak_data(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<AkStateDataResponse>, AppError> {
    let elections: Vec<AkElection> = supabase
        .fetch_all("ak_elections", Some("election_date.asc"))
        .await?;
    let important_dates: Vec<AkImportantDate> = supabase
        .fetch_all("ak_election_dates", None)
        .await?;

    Ok(Json(AkStateDataResponse { elections, important_dates }))
}

/// GET /api/al-elections
///
/// Returns all Alabama elections and local-election dates stored in Supabase.
pub async fn get_al_data(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<AlStateDataResponse>, AppError> {
    let elections: Vec<AlElection> = supabase
        .fetch_all("al_elections", Some("election_date.asc"))
        .await?;
    let important_dates: Vec<AlImportantDate> = supabase
        .fetch_all("al_election_dates", None)
        .await?;

    Ok(Json(AlStateDataResponse { elections, important_dates }))
}

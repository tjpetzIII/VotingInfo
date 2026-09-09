use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    Json,
};
use std::sync::Arc;

use crate::{
    errors::AppError,
    models::{ScrapeResult, StateDataResponse, StateElection, StateImportantDate},
    services::{scraper_utils::StateScraperConfig, supabase::SupabaseClient},
};

fn credentials_match(provided: &str, expected: &str) -> bool {
    provided.len() == expected.len()
        && provided
            .bytes()
            .zip(expected.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

/// POST /api/refresh — operator-only full refresh.
pub async fn manual_refresh(
    State(supabase): State<Arc<SupabaseClient>>,
    headers: HeaderMap,
) -> Result<(StatusCode, Json<crate::models::ScrapeResult>), AppError> {
    let expected =
        std::env::var("REFRESH_TOKEN").map_err(|_| AppError::Config("REFRESH_TOKEN".into()))?;
    let provided = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .unwrap_or("");
    if !credentials_match(provided, &expected) {
        return Err(AppError::ValidationError("Unauthorized".into()));
    }
    let summary = crate::services::refresh::run(Default::default(), supabase).await;
    Ok((
        StatusCode::OK,
        Json(crate::models::ScrapeResult {
            elections_saved: summary.succeeded,
            dates_saved: summary.succeeded,
        }),
    ))
}

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
        .upsert(
            &config.elections_table(),
            "election_date,election_type",
            &data.elections,
        )
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

    Ok(Json(ScrapeResult {
        elections_saved,
        dates_saved,
    }))
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

    Ok(Json(StateDataResponse {
        elections,
        important_dates,
    }))
}

#[cfg(test)]
mod tests {
    use super::credentials_match;

    #[test]
    fn credentials_require_exact_match() {
        assert!(credentials_match("refresh-secret", "refresh-secret"));
        assert!(!credentials_match("refresh-secret", "refresh-secret-2"));
        assert!(!credentials_match("", "refresh-secret"));
    }
}

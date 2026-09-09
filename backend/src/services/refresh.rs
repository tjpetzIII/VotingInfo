use std::{sync::Arc, time::Duration};

use futures::stream::{self, StreamExt};
use reqwest::Client;
use tokio::sync::Semaphore;

use crate::{
    models::ScrapedStateData,
    services::{
        scraper_utils::{ScrapeFn, STATE_SCRAPERS},
        supabase::SupabaseClient,
    },
};

#[derive(Debug, Clone, Copy)]
pub struct RefreshConfig {
    pub concurrency: usize,
    pub attempts: usize,
    pub timeout: Duration,
    pub backoff: Duration,
}

impl Default for RefreshConfig {
    fn default() -> Self {
        Self {
            concurrency: 3,
            attempts: 3,
            timeout: Duration::from_secs(30),
            backoff: Duration::from_millis(100),
        }
    }
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct RefreshSummary {
    pub attempted: usize,
    pub succeeded: usize,
    pub failed: usize,
}

/// Refresh each state independently. A state's existing rows are untouched until both
/// collections have been scraped successfully, preserving the last-good snapshot on failure.
pub async fn run(config: RefreshConfig, supabase: Arc<SupabaseClient>) -> RefreshSummary {
    let owner = format!("worker-{}", std::process::id());
    let expires = (chrono::Utc::now() + chrono::Duration::minutes(10)).to_rfc3339();
    if !supabase
        .try_acquire_refresh_lease(&owner, &expires)
        .await
        .unwrap_or(false)
    {
        return RefreshSummary::default();
    }
    let semaphore = Arc::new(Semaphore::new(config.concurrency.max(1)));
    let states: &'static [crate::services::scraper_utils::StateScraperConfig] = STATE_SCRAPERS;
    let mut jobs = Vec::with_capacity(states.len());
    for state in states {
        let state_code: &'static str = state.state_code;
        let scrape: ScrapeFn = state.scrape;
        jobs.push(refresh_state(
            state_code,
            scrape,
            config,
            supabase.clone(),
            semaphore.clone(),
        ));
    }
    let results: Vec<bool> = stream::iter(jobs)
        .buffer_unordered(config.concurrency.max(1))
        .collect()
        .await;
    let summary = RefreshSummary {
        attempted: results.len(),
        succeeded: results.iter().filter(|ok| **ok).count(),
        failed: results.iter().filter(|ok| !**ok).count(),
    };
    let _ = supabase.release_refresh_lease(&owner).await;
    summary
}

async fn refresh_state(
    state_code: &'static str,
    scrape: ScrapeFn,
    opts: RefreshConfig,
    supabase: Arc<SupabaseClient>,
    semaphore: Arc<Semaphore>,
) -> bool {
    let Ok(_permit) = semaphore.acquire().await else {
        return false;
    };
    let client = Client::new();
    let mut data: Option<ScrapedStateData> = None;
    for attempt in 0..opts.attempts.max(1) {
        match tokio::time::timeout(opts.timeout, (scrape)(&client)).await {
            Ok(Ok(value)) => {
                data = Some(value);
                break;
            }
            Ok(Err(_)) | Err(_) if attempt + 1 < opts.attempts.max(1) => {
                tokio::time::sleep(opts.backoff * (attempt as u32 + 1)).await
            }
            _ => break,
        }
    }
    let Some(data) = data else { return false };
    let elections_table = format!("{}_elections", state_code.to_ascii_lowercase());
    let dates_table = format!("{}_election_dates", state_code.to_ascii_lowercase());
    if supabase
        .upsert(
            &elections_table,
            "election_date,election_type",
            &data.elections,
        )
        .await
        .is_err()
    {
        return false;
    }
    supabase
        .upsert(
            &dates_table,
            "event_date,event_description,election_year",
            &data.important_dates,
        )
        .await
        .is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_are_bounded_and_conservative() {
        let c = RefreshConfig::default();
        assert_eq!(c.concurrency, 3);
        assert_eq!(c.attempts, 3);
        assert!(c.timeout <= Duration::from_secs(60));
    }
}

use std::future::Future;
use std::pin::Pin;
use std::time::{SystemTime, UNIX_EPOCH};

use reqwest::Client;
use scraper::ElementRef;

use crate::errors::AppError;
use crate::models::ScrapedStateData;

/// Collect all text nodes within an element, joining them and trimming.
pub fn collect_text(el: &ElementRef) -> String {
    el.text().collect::<Vec<_>>().join("").trim().to_string()
}

/// Classifies an election name into one of the four canonical types the
/// frontend's color map expects.
pub fn determine_type(election_name: &str) -> String {
    let lower = election_name.to_lowercase();
    if lower.contains("primary") {
        "primary".to_string()
    } else if lower.contains("special") {
        // Checked before "general": a "Special General Election" (e.g. FL's
        // off-cycle district races held on the general's date) is a special
        // election first — classifying it "general" would collide with the
        // real general election on the same (election_date, election_type)
        // unique key.
        "special".to_string()
    } else if lower.contains("general") {
        "general".to_string()
    } else {
        "other".to_string()
    }
}

/// Fallback year when a scraped page doesn't state one explicitly — use the
/// current year (rough estimate from seconds since epoch, good enough for a
/// fallback).
pub fn chrono_year_fallback() -> i32 {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    1970 + (secs / 31_557_600) as i32
}

/// A boxed, `Send` future wrapping a state scraper's `scrape()` call so it can
/// be stored as a function pointer in [`StateScraperConfig`].
pub type ScrapeFuture<'a> = Pin<Box<dyn Future<Output = Result<ScrapedStateData, AppError>> + Send + 'a>>;
pub type ScrapeFn = for<'a> fn(&'a Client) -> ScrapeFuture<'a>;

/// Registry entry describing everything the generic scraper routes and the
/// election-dates aggregator need to know about one state.
///
/// Adding a new state means adding one `ScrapedStateData`-returning scraper
/// module plus one entry here — no new route handlers or match arms required.
pub struct StateScraperConfig {
    /// Two-letter uppercase state code, e.g. `"PA"`. Matches the `state_code`
    /// column and `extract_state_from_address`'s output.
    pub state_code: &'static str,
    pub scrape: ScrapeFn,
}

impl StateScraperConfig {
    /// Lowercase state code, used for route paths and table-name prefixes.
    pub fn lower(&self) -> String {
        self.state_code.to_ascii_lowercase()
    }

    pub fn elections_table(&self) -> String {
        format!("{}_elections", self.lower())
    }

    pub fn dates_table(&self) -> String {
        format!("{}_election_dates", self.lower())
    }
}

fn scrape_pa(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::pa_scraper::scrape(client))
}

fn scrape_al(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::al_scraper::scrape(client))
}

fn scrape_ak(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::ak_scraper::scrape(client))
}

fn scrape_wi(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::wi_scraper::scrape(client))
}

fn scrape_mi(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::mi_scraper::scrape(client))
}

fn scrape_oh(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::oh_scraper::scrape(client))
}

fn scrape_ga(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::ga_scraper::scrape(client))
}

fn scrape_az(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::az_scraper::scrape(client))
}

fn scrape_nv(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::nv_scraper::scrape(client))
}

fn scrape_nc(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::nc_scraper::scrape(client))
}

fn scrape_fl(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::fl_scraper::scrape(client))
}

/// Every state we have a scraper for. Route registration
/// (`lib.rs::api_router`) and the election-dates aggregator
/// (`election_dates.rs::augment_from_scraped_data`) both drive off this list.
pub static STATE_SCRAPERS: &[StateScraperConfig] = &[
    StateScraperConfig { state_code: "PA", scrape: scrape_pa },
    StateScraperConfig { state_code: "AL", scrape: scrape_al },
    StateScraperConfig { state_code: "AK", scrape: scrape_ak },
    StateScraperConfig { state_code: "WI", scrape: scrape_wi },
    StateScraperConfig { state_code: "MI", scrape: scrape_mi },
    StateScraperConfig { state_code: "OH", scrape: scrape_oh },
    StateScraperConfig { state_code: "GA", scrape: scrape_ga },
    StateScraperConfig { state_code: "AZ", scrape: scrape_az },
    StateScraperConfig { state_code: "NV", scrape: scrape_nv },
    StateScraperConfig { state_code: "NC", scrape: scrape_nc },
    StateScraperConfig { state_code: "FL", scrape: scrape_fl },
];

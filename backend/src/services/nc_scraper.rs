use reqwest::Client;

use crate::{errors::AppError, models::ScrapedStateData, services::usvotefoundation};

/// North Carolina's own elections site (ncsbe.gov) is a sprawling portal
/// with no single dedicated dates page to scrape reliably, so this sources
/// from the U.S. Vote Foundation aggregator instead — see
/// `usvotefoundation::scrape` for the shared fetch+parse logic.
pub async fn scrape(client: &Client) -> Result<ScrapedStateData, AppError> {
    usvotefoundation::scrape(client, "north-carolina", "NC").await
}

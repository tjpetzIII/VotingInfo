use reqwest::Client;

use crate::{errors::AppError, models::ScrapedStateData, services::usvotefoundation};

/// Nevada's own elections site (nvsos.gov) is a sprawling department portal
/// with no single dedicated dates page to scrape reliably, so this sources
/// from the U.S. Vote Foundation aggregator instead — see
/// `usvotefoundation::scrape` for the shared fetch+parse logic.
pub async fn scrape(client: &Client) -> Result<ScrapedStateData, AppError> {
    usvotefoundation::scrape(client, "nevada", "NV").await
}

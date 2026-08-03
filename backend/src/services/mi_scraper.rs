use reqwest::Client;

use crate::{errors::AppError, models::ScrapedStateData, services::usvotefoundation};

/// Sourced from the U.S. Vote Foundation aggregator — see
/// `usvotefoundation::scrape` for the shared fetch+parse logic.
pub async fn scrape(client: &Client) -> Result<ScrapedStateData, AppError> {
    usvotefoundation::scrape(client, "michigan", "MI").await
}

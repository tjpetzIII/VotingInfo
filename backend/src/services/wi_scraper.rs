use reqwest::Client;

use crate::{errors::AppError, models::ScrapedStateData, services::usvotefoundation};

/// Wisconsin's own elections sites (elections.wi.gov, myvote.wi.gov) sit
/// behind a Cloudflare bot challenge that a plain `reqwest` GET cannot pass,
/// so this sources from the U.S. Vote Foundation aggregator instead — see
/// `usvotefoundation::scrape` for the shared fetch+parse logic.
pub async fn scrape(client: &Client) -> Result<ScrapedStateData, AppError> {
    usvotefoundation::scrape(client, "wisconsin", "WI").await
}

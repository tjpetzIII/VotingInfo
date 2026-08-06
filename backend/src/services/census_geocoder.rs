//! Client for the Census Bureau Geocoder (https://geocoding.geo.census.gov/), the primary
//! coordinate-lookup source for polling-location addresses as of VOT-59.
//!
//! See `specs/008-census-geocoder-migration/contracts/census-geocoder-api.md` for the full
//! request/response contract this client implements against: no API key, no documented rate
//! limit, `onelineaddress` search against the `Public_AR_Current` benchmark, and an empty
//! `addressMatches` array (still HTTP 200) meaning "no match" rather than an error.

use std::time::Duration;

use reqwest::Client;
use serde::Deserialize;

const CENSUS_BASE: &str = "https://geocoding.geo.census.gov/geocoder";

#[derive(Debug, Deserialize)]
struct CensusResponse {
    result: CensusResult,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct CensusResult {
    #[serde(default)]
    address_matches: Vec<CensusMatch>,
}

#[derive(Debug, Deserialize)]
struct CensusMatch {
    coordinates: CensusCoordinates,
}

#[derive(Debug, Deserialize)]
struct CensusCoordinates {
    x: f64,
    y: f64,
}

pub struct CensusGeocoderClient {
    client: Client,
    base_url: String,
}

impl Default for CensusGeocoderClient {
    fn default() -> Self {
        Self::new()
    }
}

impl CensusGeocoderClient {
    pub fn new() -> Self {
        Self::build(CENSUS_BASE.to_string())
    }

    pub fn new_with_base_url(base_url: &str) -> Self {
        Self::build(base_url.to_string())
    }

    fn build(base_url: String) -> Self {
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("failed to build census geocoder http client"),
            base_url,
        }
    }

    /// Geocodes an address string via the Census Bureau's `onelineaddress` endpoint, returning
    /// `(lat, lng)` on a match. No pacing is applied — the Census Geocoder documents no rate
    /// limit and requires no API key.
    pub async fn geocode(&self, address: &str) -> Option<(f64, f64)> {
        let response = self
            .client
            .get(format!("{}/locations/onelineaddress", self.base_url))
            .query(&[
                ("address", address),
                ("benchmark", "Public_AR_Current"),
                ("format", "json"),
            ])
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let body: CensusResponse = response.json().await.ok()?;
        let first = body.result.address_matches.into_iter().next()?;
        Some((first.coordinates.y, first.coordinates.x))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn matched_response() -> serde_json::Value {
        serde_json::json!({
            "result": {
                "input": {},
                "addressMatches": [{
                    "matchedAddress": "123 MAIN ST, SPRINGFIELD, IL, 62701",
                    "coordinates": { "x": -89.6501, "y": 39.7817 },
                    "addressComponents": {},
                    "tigerLine": {}
                }]
            }
        })
    }

    fn no_match_response() -> serde_json::Value {
        serde_json::json!({ "result": { "input": {}, "addressMatches": [] } })
    }

    #[tokio::test]
    async fn geocode_returns_lat_lng_from_y_x() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/locations/onelineaddress"))
            .respond_with(ResponseTemplate::new(200).set_body_json(matched_response()))
            .mount(&mock)
            .await;

        let geocoder = CensusGeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("123 Main St, Springfield, IL 62701").await;
        let (lat, lng) = result.expect("expected a match");
        assert!((lat - 39.7817).abs() < 0.001);
        assert!((lng - -89.6501).abs() < 0.001);
    }

    #[tokio::test]
    async fn geocode_empty_matches_returns_none() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/locations/onelineaddress"))
            .respond_with(ResponseTemplate::new(200).set_body_json(no_match_response()))
            .mount(&mock)
            .await;

        let geocoder = CensusGeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("Nowhere, XX 00000").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn geocode_non_200_returns_none() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/locations/onelineaddress"))
            .respond_with(ResponseTemplate::new(500))
            .mount(&mock)
            .await;

        let geocoder = CensusGeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("123 Main St").await;
        assert!(result.is_none());
    }
}

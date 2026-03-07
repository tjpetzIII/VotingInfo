use std::time::{Duration, Instant};

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;
use tokio::sync::Mutex;

const NOMINATIM_BASE: &str = "https://nominatim.openstreetmap.org";
pub const USER_AGENT: &str = "voter-info-app/1.0";

#[derive(Deserialize)]
struct NominatimResult {
    lat: String,
    lon: String,
}

pub struct GeocoderClient {
    client: Client,
    base_url: String,
    cache: Cache<String, Option<(f64, f64)>>,
    last_request: Mutex<Option<Instant>>,
}

impl Default for GeocoderClient {
    fn default() -> Self {
        Self::new()
    }
}

impl GeocoderClient {
    pub fn new() -> Self {
        Self::build(NOMINATIM_BASE.to_string())
    }

    pub fn new_with_base_url(base_url: &str) -> Self {
        Self::build(base_url.to_string())
    }

    fn build(base_url: String) -> Self {
        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(24 * 60 * 60))
            .build();
        Self {
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("failed to build geocoder http client"),
            base_url,
            cache,
            last_request: Mutex::new(None),
        }
    }

    /// Geocodes an address string, returning `(lat, lng)` if successful.
    /// Results are cached for 24 hours. Requests to Nominatim are serialized
    /// with at least 1 second between them per Nominatim usage policy.
    pub async fn geocode(&self, address: &str) -> Option<(f64, f64)> {
        if let Some(cached) = self.cache.get(address).await {
            return cached;
        }

        // Hold the lock across the sleep so concurrent callers queue up,
        // ensuring >= 1s between successive Nominatim requests.
        {
            let mut last = self.last_request.lock().await;
            if let Some(t) = *last {
                let elapsed = t.elapsed();
                if elapsed < Duration::from_secs(1) {
                    tokio::time::sleep(Duration::from_secs(1) - elapsed).await;
                }
            }
            *last = Some(Instant::now());
        }

        let result = self.fetch(address).await;
        self.cache.insert(address.to_string(), result).await;
        result
    }

    async fn fetch(&self, address: &str) -> Option<(f64, f64)> {
        let response = self
            .client
            .get(format!("{}/search", self.base_url))
            .header("User-Agent", USER_AGENT)
            .query(&[("q", address), ("format", "json"), ("limit", "1")])
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let results: Vec<NominatimResult> = response.json().await.ok()?;
        let first = results.into_iter().next()?;
        let lat = first.lat.parse::<f64>().ok()?;
        let lng = first.lon.parse::<f64>().ok()?;
        Some((lat, lng))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    fn nominatim_response() -> serde_json::Value {
        serde_json::json!([{
            "lat": "39.7817",
            "lon": "-89.6501",
            "display_name": "Springfield, IL"
        }])
    }

    #[tokio::test]
    async fn geocode_returns_lat_lng() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/search"))
            .and(header("User-Agent", USER_AGENT))
            .respond_with(ResponseTemplate::new(200).set_body_json(nominatim_response()))
            .mount(&mock)
            .await;

        let geocoder = GeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("123 Main St, Springfield, IL 62701").await;
        assert!(result.is_some());
        let (lat, lng) = result.unwrap();
        assert!((lat - 39.7817).abs() < 0.001);
        assert!((lng - -89.6501).abs() < 0.001);
    }

    #[tokio::test]
    async fn geocode_empty_result_returns_none() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/search"))
            .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
            .mount(&mock)
            .await;

        let geocoder = GeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("Nowhere, XX 00000").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn geocode_non_200_returns_none() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/search"))
            .respond_with(ResponseTemplate::new(429))
            .mount(&mock)
            .await;

        let geocoder = GeocoderClient::new_with_base_url(&mock.uri());
        let result = geocoder.geocode("123 Main St").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn geocode_cache_hit_calls_nominatim_once() {
        let mock = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/search"))
            .respond_with(ResponseTemplate::new(200).set_body_json(nominatim_response()))
            .expect(1)
            .mount(&mock)
            .await;

        let geocoder = GeocoderClient::new_with_base_url(&mock.uri());
        geocoder.geocode("123 Main St, Springfield, IL").await;
        geocoder.geocode("123 Main St, Springfield, IL").await;
        // wiremock verifies .expect(1) on drop
    }
}

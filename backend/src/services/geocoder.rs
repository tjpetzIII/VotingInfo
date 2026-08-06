use std::time::{Duration, Instant};

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;
use tokio::sync::Mutex;

use crate::services::census_geocoder::CensusGeocoderClient;

const NOMINATIM_BASE: &str = "https://nominatim.openstreetmap.org";
pub const USER_AGENT: &str = "voter-info-app/1.0";

#[derive(Deserialize)]
struct NominatimResult {
    lat: String,
    lon: String,
}

/// Geocodes polling-location addresses to `(lat, lng)` coordinates. The Census Bureau Geocoder
/// (`CensusGeocoderClient`) is tried first and is not paced — it documents no rate limit and
/// needs no API key (VOT-59). Nominatim is used only as a fallback for addresses Census can't
/// match, and remains paced at >=1s between requests per Nominatim's own usage policy, since
/// that pacing exists to satisfy Nominatim's policy rather than as a general app-level throttle.
/// A single 24h cache holds the resolved coordinate regardless of which source produced it.
pub struct GeocoderClient {
    census: CensusGeocoderClient,
    client: Client,
    nominatim_base_url: String,
    cache: Cache<String, Option<(f64, f64)>>,
    last_nominatim_request: Mutex<Option<Instant>>,
}

impl Default for GeocoderClient {
    fn default() -> Self {
        Self::new()
    }
}

impl GeocoderClient {
    pub fn new() -> Self {
        Self::build(None, NOMINATIM_BASE.to_string())
    }

    /// Points the Nominatim fallback at `base_url` (e.g. a test mock server); Census continues to
    /// use its real host. Use `new_with_urls` when a test needs to mock both sources.
    pub fn new_with_base_url(base_url: &str) -> Self {
        Self::build(None, base_url.to_string())
    }

    /// Points both the Census primary and Nominatim fallback at test mock servers.
    pub fn new_with_urls(census_base_url: &str, nominatim_base_url: &str) -> Self {
        Self::build(
            Some(census_base_url.to_string()),
            nominatim_base_url.to_string(),
        )
    }

    fn build(census_base_url: Option<String>, nominatim_base_url: String) -> Self {
        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(24 * 60 * 60))
            .build();
        let census = match census_base_url {
            Some(url) => CensusGeocoderClient::new_with_base_url(&url),
            None => CensusGeocoderClient::new(),
        };
        Self {
            census,
            client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("failed to build geocoder http client"),
            nominatim_base_url,
            cache,
            last_nominatim_request: Mutex::new(None),
        }
    }

    /// Geocodes an address string, returning `(lat, lng)` if successful. Results are cached for
    /// 24 hours regardless of which source (Census or Nominatim) produced them. Census is tried
    /// first with no added delay; Nominatim is only reached — and only then paced — when Census
    /// can't match the address.
    pub async fn geocode(&self, address: &str) -> Option<(f64, f64)> {
        if let Some(cached) = self.cache.get(address).await {
            return cached;
        }

        let result = match self.census.geocode(address).await {
            Some(coords) => Some(coords),
            None => self.fetch_nominatim_paced(address).await,
        };

        self.cache.insert(address.to_string(), result).await;
        result
    }

    async fn fetch_nominatim_paced(&self, address: &str) -> Option<(f64, f64)> {
        // Hold the lock across the sleep so concurrent callers queue up,
        // ensuring >= 1s between successive Nominatim requests.
        {
            let mut last = self.last_nominatim_request.lock().await;
            if let Some(t) = *last {
                let elapsed = t.elapsed();
                if elapsed < Duration::from_secs(1) {
                    tokio::time::sleep(Duration::from_secs(1) - elapsed).await;
                }
            }
            *last = Some(Instant::now());
        }

        self.fetch_nominatim(address).await
    }

    async fn fetch_nominatim(&self, address: &str) -> Option<(f64, f64)> {
        let response = self
            .client
            .get(format!("{}/search", self.nominatim_base_url))
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

    fn census_matched_response(lat: f64, lng: f64) -> serde_json::Value {
        serde_json::json!({
            "result": {
                "input": {},
                "addressMatches": [{
                    "matchedAddress": "123 MAIN ST, SPRINGFIELD, IL, 62701",
                    "coordinates": { "x": lng, "y": lat },
                    "addressComponents": {},
                    "tigerLine": {}
                }]
            }
        })
    }

    fn census_no_match_response() -> serde_json::Value {
        serde_json::json!({ "result": { "input": {}, "addressMatches": [] } })
    }

    fn nominatim_matched_response(lat: f64, lng: f64) -> serde_json::Value {
        serde_json::json!([{
            "lat": lat.to_string(),
            "lon": lng.to_string(),
            "display_name": "Springfield, IL"
        }])
    }

    async fn mount_census(mock: &MockServer, response: ResponseTemplate) {
        Mock::given(method("GET"))
            .and(path("/locations/onelineaddress"))
            .respond_with(response)
            .mount(mock)
            .await;
    }

    async fn mount_nominatim(mock: &MockServer, response: ResponseTemplate) {
        Mock::given(method("GET"))
            .and(path("/search"))
            .and(header("User-Agent", USER_AGENT))
            .respond_with(response)
            .mount(mock)
            .await;
    }

    #[tokio::test]
    async fn geocode_census_hit_returns_lat_lng_and_skips_nominatim() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(
            &census,
            ResponseTemplate::new(200).set_body_json(census_matched_response(39.7817, -89.6501)),
        )
        .await;
        Mock::given(method("GET"))
            .and(path("/search"))
            .respond_with(ResponseTemplate::new(200))
            .expect(0)
            .mount(&nominatim)
            .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let (lat, lng) = geocoder
            .geocode("123 Main St, Springfield, IL 62701")
            .await
            .expect("expected a match");
        assert!((lat - 39.7817).abs() < 0.001);
        assert!((lng - -89.6501).abs() < 0.001);
    }

    #[tokio::test]
    async fn geocode_census_miss_falls_back_to_nominatim() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(
            &census,
            ResponseTemplate::new(200).set_body_json(census_no_match_response()),
        )
        .await;
        mount_nominatim(
            &nominatim,
            ResponseTemplate::new(200).set_body_json(nominatim_matched_response(39.7817, -89.6501)),
        )
        .await;

        // Non-standard, polling-location-style address (e.g. PO-box-style entry) that Census
        // can't match but Nominatim still can.
        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let result = geocoder
            .geocode("PO Box 42, Rural Route 3, Springfield, IL")
            .await;
        assert!(result.is_some());
    }

    #[tokio::test]
    async fn geocode_both_miss_returns_none() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(
            &census,
            ResponseTemplate::new(200).set_body_json(census_no_match_response()),
        )
        .await;
        mount_nominatim(
            &nominatim,
            ResponseTemplate::new(200).set_body_json(serde_json::json!([])),
        )
        .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let result = geocoder.geocode("Nowhere, XX 00000").await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn geocode_census_error_falls_back_to_nominatim() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(&census, ResponseTemplate::new(500)).await;
        mount_nominatim(
            &nominatim,
            ResponseTemplate::new(200).set_body_json(nominatim_matched_response(39.7817, -89.6501)),
        )
        .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let result = geocoder.geocode("123 Main St, Springfield, IL").await;
        assert!(result.is_some());
    }

    #[tokio::test]
    async fn geocode_cache_hit_avoids_second_census_lookup() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/locations/onelineaddress"))
            .respond_with(
                ResponseTemplate::new(200)
                    .set_body_json(census_matched_response(39.7817, -89.6501)),
            )
            .expect(1)
            .mount(&census)
            .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        geocoder.geocode("123 Main St, Springfield, IL").await;
        geocoder.geocode("123 Main St, Springfield, IL").await;
        // wiremock verifies .expect(1) on drop
    }

    #[tokio::test]
    async fn geocode_census_hits_incur_no_pacing_delay() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(
            &census,
            ResponseTemplate::new(200).set_body_json(census_matched_response(39.7817, -89.6501)),
        )
        .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let start = Instant::now();
        geocoder.geocode("111 First St, Springfield, IL").await;
        geocoder.geocode("222 Second St, Springfield, IL").await;
        geocoder.geocode("333 Third St, Springfield, IL").await;
        assert!(
            start.elapsed() < Duration::from_millis(500),
            "Census-hit lookups should not incur the Nominatim pacing delay"
        );
    }

    #[tokio::test]
    async fn geocode_fallback_pacing_still_enforced() {
        let census = MockServer::start().await;
        let nominatim = MockServer::start().await;
        mount_census(
            &census,
            ResponseTemplate::new(200).set_body_json(census_no_match_response()),
        )
        .await;
        mount_nominatim(
            &nominatim,
            ResponseTemplate::new(200).set_body_json(nominatim_matched_response(39.7817, -89.6501)),
        )
        .await;

        let geocoder = GeocoderClient::new_with_urls(&census.uri(), &nominatim.uri());
        let start = Instant::now();
        geocoder.geocode("111 First St, Springfield, IL").await;
        geocoder.geocode("222 Second St, Springfield, IL").await;
        assert!(
            start.elapsed() >= Duration::from_secs(1),
            "fallback-only lookups must still be paced >= 1s apart"
        );
    }
}

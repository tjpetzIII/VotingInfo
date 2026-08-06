//! One-off spike runner for VOT-59 (see `specs/008-census-geocoder-migration/research.md` §4).
//!
//! Calls the Census Bureau Geocoder and Nominatim directly (both live, unmocked) for a fixed
//! sample of polling-location-style addresses — clean street addresses plus deliberately
//! non-standard formats (PO-box-style, rural route, building-name-first) — and prints a CSV
//! comparing match rate and coordinate divergence between the two sources. Not part of the
//! production binary; run manually with `cargo run --bin census_geocoder_spike` and paste the
//! output into `docs/census-geocoder-spike.md` along with the resulting go/no-go decision.
//!
//! Nominatim is queried directly here (not through `GeocoderClient`) since the spike needs both
//! sources' raw answers for every address to compare them — production code only falls through to
//! Nominatim on a Census miss. This script still paces its own Nominatim calls >=1s apart per
//! Nominatim's usage policy, since that policy applies to any caller, not just this app's
//! fallback path.

use std::time::Duration;

use backend::services::census_geocoder::CensusGeocoderClient;
use reqwest::Client;
use serde::Deserialize;

const NOMINATIM_BASE: &str = "https://nominatim.openstreetmap.org";
const USER_AGENT: &str = "voter-info-app/1.0 (VOT-59 spike)";
/// Flag pairs of matched coordinates more than this far apart for manual review
/// (research.md §4 — a spike-internal triage threshold, not a product requirement).
const DIVERGENCE_FLAG_KM: f64 = 1.0;

#[derive(Deserialize)]
struct NominatimResult {
    lat: String,
    lon: String,
}

/// Sample addresses for the spike: a mix of clean street addresses (public buildings that
/// commonly serve as polling places) and non-standard formats seen on state election-department
/// pages (PO-box-style, rural route, building-name-first entries) — the two categories called out
/// in VOT-59's scope.
const SAMPLE: &[(&str, &str)] = &[
    // -- Clean street addresses --
    ("1 City Hall Square, Boston, MA 02201", "clean"),
    ("200 N Spring St, Los Angeles, CA 90012", "clean"),
    ("121 N LaSalle St, Chicago, IL 60602", "clean"),
    ("1500 Marilla St, Dallas, TX 75201", "clean"),
    ("830 Punchbowl St, Honolulu, HI 96813", "clean"),
    ("1 Judiciary Square NW, Washington, DC 20001", "clean"),
    ("1200 Main St, Kansas City, MO 64105", "clean"),
    ("1437 Bannock St, Denver, CO 80202", "clean"),
    ("301 King St, Alexandria, VA 22314", "clean"),
    ("45 Lyon Terrace, Bridgeport, CT 06604", "clean"),
    ("550 Main St, Hartford, CT 06103", "clean"),
    ("601 4th Ave, Seattle, WA 98104", "clean"),
    ("1685 Main St, Sarasota, FL 34236", "clean"),
    ("700 H St, Sacramento, CA 95814", "clean"),
    ("100 N Holliday St, Baltimore, MD 21202", "clean"),
    // -- Non-standard, polling-location-style formats --
    ("Grange Hall, Rural Route 2, Chillicothe, OH", "non_standard"),
    ("PO Box 118, Ely, NV 89301", "non_standard"),
    ("VFW Post 1138, Main St, Beloit, WI", "non_standard"),
    ("Rural Route 1 Box 45, Emmetsburg, IA 50536", "non_standard"),
    ("Town Hall, Route 7, Wilmington, VT", "non_standard"),
    ("American Legion Hall, Route 9, Chester, NY", "non_standard"),
    ("PO Box 372, Talkeetna, AK 99676", "non_standard"),
    ("Grange Hall Road, RR 3, Bethel, ME", "non_standard"),
    ("Fire Station No. 2, Route 50, Berlin, MD", "non_standard"),
    ("PO Box 55, Cut Bank, MT 59427", "non_standard"),
    ("Community Center, Star Route, Marfa, TX", "non_standard"),
    ("Elks Lodge 99, Route 20, Pittsfield, MA", "non_standard"),
    ("Rural Route 4 Box 12, Winner, SD 57580", "non_standard"),
    ("Masonic Hall, Route 1, Wiscasset, ME", "non_standard"),
    ("PO Box 90, Barrow, AK 99723", "non_standard"),
];

async fn geocode_nominatim(client: &Client, address: &str) -> Option<(f64, f64)> {
    let response = client
        .get(format!("{NOMINATIM_BASE}/search"))
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
    Some((first.lat.parse().ok()?, first.lon.parse().ok()?))
}

/// Great-circle distance between two lat/lng points, in kilometers.
fn haversine_km(a: (f64, f64), b: (f64, f64)) -> f64 {
    const EARTH_RADIUS_KM: f64 = 6371.0;
    let (lat1, lon1) = (a.0.to_radians(), a.1.to_radians());
    let (lat2, lon2) = (b.0.to_radians(), b.1.to_radians());
    let (dlat, dlon) = (lat2 - lat1, lon2 - lon1);
    let h = (dlat / 2.0).sin().powi(2) + lat1.cos() * lat2.cos() * (dlon / 2.0).sin().powi(2);
    2.0 * EARTH_RADIUS_KM * h.sqrt().asin()
}

#[tokio::main]
async fn main() {
    let census = CensusGeocoderClient::new();
    let nominatim_client = Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .expect("failed to build nominatim http client");

    let mut census_matches = 0usize;
    let mut nominatim_matches = 0usize;
    let mut flagged = Vec::new();

    println!("address,category,census_match,nominatim_match,distance_km,flagged");

    for (i, (address, category)) in SAMPLE.iter().enumerate() {
        // Census has no documented rate limit — call it unpaced.
        let census_result = census.geocode(address).await;

        // Pace Nominatim calls >=1s apart, per its usage policy — even though this script isn't
        // the production fallback path, the policy applies to any caller hitting the live host.
        if i > 0 {
            tokio::time::sleep(Duration::from_secs(1)).await;
        }
        let nominatim_result = geocode_nominatim(&nominatim_client, address).await;

        if census_result.is_some() {
            census_matches += 1;
        }
        if nominatim_result.is_some() {
            nominatim_matches += 1;
        }

        let (distance_str, flag) = match (census_result, nominatim_result) {
            (Some(c), Some(n)) => {
                let d = haversine_km(c, n);
                let flag = d > DIVERGENCE_FLAG_KM;
                if flag {
                    flagged.push((*address, d));
                }
                (format!("{d:.3}"), flag)
            }
            _ => (String::new(), false),
        };

        println!(
            "\"{}\",{},{},{},{},{}",
            address,
            category,
            census_result.is_some(),
            nominatim_result.is_some(),
            distance_str,
            flag
        );
    }

    eprintln!();
    eprintln!("=== Summary ===");
    eprintln!("Sample size: {}", SAMPLE.len());
    eprintln!(
        "Census match rate: {}/{} ({:.1}%)",
        census_matches,
        SAMPLE.len(),
        100.0 * census_matches as f64 / SAMPLE.len() as f64
    );
    eprintln!(
        "Nominatim match rate: {}/{} ({:.1}%)",
        nominatim_matches,
        SAMPLE.len(),
        100.0 * nominatim_matches as f64 / SAMPLE.len() as f64
    );
    eprintln!("Flagged divergences (> {DIVERGENCE_FLAG_KM}km apart): {}", flagged.len());
    for (address, distance) in &flagged {
        eprintln!("  - {address}: {distance:.3}km");
    }
}

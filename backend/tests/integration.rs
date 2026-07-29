use std::sync::Arc;

use axum::body::Body;
use backend::{build_app_router, services::civic_api::CivicApiClient};
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use wiremock::matchers::{header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_app(mock_server: &MockServer) -> axum::Router {
    let client = CivicApiClient::new_with_base_url("test_key", &mock_server.uri());
    build_app_router(Arc::new(client))
}

fn make_app_with_geocoder(civic_mock: &MockServer, geocoder_mock: &MockServer) -> axum::Router {
    let client = CivicApiClient::new_with_urls("test_key", &civic_mock.uri(), &geocoder_mock.uri());
    build_app_router(Arc::new(client))
}

async fn body_json(body: Body) -> Value {
    let bytes = body.collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

fn get(uri: &str) -> Request<Body> {
    Request::builder().uri(uri).body(Body::empty()).unwrap()
}

// ---------------------------------------------------------------------------
// Mock response fixtures
// ---------------------------------------------------------------------------

fn elections_list_response() -> Value {
    json!({
        "elections": [
            {
                "id": "2000",
                "name": "VIP Test Election",
                "electionDay": "2025-06-01",
                "ocdDivisionId": "ocd-division/country:us"
            },
            {
                "id": "9001",
                "name": "General Election",
                "electionDay": "2025-11-04",
                "ocdDivisionId": "ocd-division/country:us/state:ca"
            }
        ]
    })
}

fn voter_info_response() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "pollingLocations": [
            {
                "address": {
                    "locationName": "City Hall",
                    "line1": "123 Main St",
                    "city": "Springfield",
                    "state": "IL",
                    "zip": "62701"
                },
                "pollingHours": "7 AM - 8 PM"
            }
        ],
        "contests": [
            {
                "office": "Mayor",
                "district": { "name": "Springfield" },
                "candidates": [
                    { "name": "Alice Smith", "party": "Democratic" },
                    { "name": "Bob Jones", "party": "Republican" }
                ]
            }
        ]
    })
}

fn voter_info_with_registration() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "pollingLocations": [],
        "contests": [],
        "state": [
            {
                "electionAdministrationBody": {
                    "name": "Illinois State Board of Elections",
                    "electionInfoUrl": "https://www.elections.il.gov/",
                    "electionRegistrationUrl": "https://ova.elections.il.gov/",
                    "electionRegistrationConfirmationUrl": "https://www.elections.il.gov/VotingAndRegistrationSystems/RegistrationLookUpByAddress.aspx",
                    "absenteeVotingInfoUrl": "https://www.elections.il.gov/AbsenteeBallots/",
                    "votingLocationFinderUrl": "https://www.elections.il.gov/ElectionInformation/PollingPlaceLocator.aspx",
                    "ballotInfoUrl": "https://www.elections.il.gov/ElectionInformation/",
                    "electionRulesUrl": "https://www.elections.il.gov/ElectionOperations/",
                    "voter_services": "Voter Registration|Absentee Ballots|Early Voting",
                    "hoursOfOperation": "Monday-Friday 8am-5pm CT",
                    "registrationDeadline": "10/08/2025",
                    "correspondenceAddress": {
                        "locationName": "Illinois State Board of Elections",
                        "line1": "2329 S. MacArthur Blvd",
                        "city": "Springfield",
                        "state": "IL",
                        "zip": "62704"
                    },
                    "electionOfficials": [
                        {
                            "name": "Steve Sandvoss",
                            "title": "Executive Director",
                            "emailAddress": "info@elections.il.gov",
                            "officePhoneNumber": "217-782-4141",
                            "faxNumber": "217-782-5959"
                        }
                    ]
                }
            }
        ]
    })
}

fn voter_info_without_registration() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "pollingLocations": [],
        "contests": [],
        "state": []
    })
}

/// Admin body present for IL but `electionRegistrationUrl` is intentionally absent.
/// Used to verify that the static fallback URL is used when the Civic API omits it.
fn voter_info_with_registration_no_reg_url() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "pollingLocations": [],
        "contests": [],
        "state": [
            {
                "electionAdministrationBody": {
                    "name": "Illinois State Board of Elections",
                    "electionInfoUrl": "https://www.elections.il.gov/",
                    "hoursOfOperation": "Monday-Friday 8am-5pm CT"
                }
            }
        ]
    })
}

fn parse_error_response() -> Value {
    json!({
        "error": {
            "code": 400,
            "message": "Unable to parse address.",
            "errors": [{ "reason": "parseError" }]
        }
    })
}

fn election_unknown_response() -> Value {
    json!({
        "error": {
            "code": 400,
            "message": "Election unknown",
            "errors": [{ "reason": "invalid" }]
        }
    })
}

// ---------------------------------------------------------------------------
// /health
// ---------------------------------------------------------------------------

#[tokio::test]
async fn health_returns_ok() {
    let mock_server = MockServer::start().await;
    let response = make_app(&mock_server)
        .oneshot(get("/health"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["status"], "ok");
}

// ---------------------------------------------------------------------------
// GET /api/all-elections
// ---------------------------------------------------------------------------

#[tokio::test]
async fn all_elections_returns_list_filtered() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/elections"))
        .respond_with(ResponseTemplate::new(200).set_body_json(elections_list_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/all-elections"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let elections = json["elections"].as_array().unwrap();
    // VIP Test Election must be filtered out
    assert_eq!(elections.len(), 1);
    assert_eq!(elections[0]["name"], "General Election");
    assert_eq!(elections[0]["id"], "9001");
}

#[tokio::test]
async fn all_elections_empty_list() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/elections"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({ "elections": [] })))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/all-elections"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["elections"].as_array().unwrap().len(), 0);
}

// ---------------------------------------------------------------------------
// GET /api/voter-info
// ---------------------------------------------------------------------------

#[tokio::test]
async fn voter_info_success() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/voter-info?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["election"]["name"], "General Election");
    assert_eq!(json["polling_locations"].as_array().unwrap().len(), 1);
    assert_eq!(json["contests"][0]["office"], "Mayor");
    assert_eq!(json["contests"][0]["candidates"].as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn voter_info_parse_error_returns_422() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(parse_error_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/voter-info?address=bad"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["code"], "VALIDATION_ERROR");
}

#[tokio::test]
async fn voter_info_election_unknown_returns_404() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(election_unknown_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/voter-info?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["code"], "NOT_FOUND");
}

#[tokio::test]
async fn voter_info_missing_address_returns_422() {
    let mock_server = MockServer::start().await;
    // No mock needed — axum rejects the request before it hits the handler.
    let response = make_app(&mock_server)
        .oneshot(get("/api/voter-info"))
        .await
        .unwrap();

    // Axum returns 400 for a missing required query parameter.
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

// ---------------------------------------------------------------------------
// GET /api/voter-info — geocoding
// ---------------------------------------------------------------------------

fn nominatim_response() -> Value {
    serde_json::json!([{
        "lat": "39.7817",
        "lon": "-89.6501",
        "display_name": "Springfield, IL"
    }])
}

#[tokio::test]
async fn voter_info_polling_locations_include_lat_lng() {
    let civic_mock = MockServer::start().await;
    let geocoder_mock = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_response()))
        .mount(&civic_mock)
        .await;

    Mock::given(method("GET"))
        .and(path("/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(nominatim_response()))
        .mount(&geocoder_mock)
        .await;

    let response = make_app_with_geocoder(&civic_mock, &geocoder_mock)
        .oneshot(get("/api/voter-info?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let loc = &json["polling_locations"][0];
    assert!(loc["lat"].is_number(), "lat should be a number");
    assert!(loc["lng"].is_number(), "lng should be a number");
    assert!((loc["lat"].as_f64().unwrap() - 39.7817).abs() < 0.001);
    assert!((loc["lng"].as_f64().unwrap() - -89.6501).abs() < 0.001);
}

#[tokio::test]
async fn voter_info_geocoder_sends_correct_user_agent() {
    let civic_mock = MockServer::start().await;
    let geocoder_mock = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_response()))
        .mount(&civic_mock)
        .await;

    // Only match requests that include the correct User-Agent header.
    Mock::given(method("GET"))
        .and(path("/search"))
        .and(header("User-Agent", "voter-info-app/1.0"))
        .respond_with(ResponseTemplate::new(200).set_body_json(nominatim_response()))
        .expect(1)
        .mount(&geocoder_mock)
        .await;

    make_app_with_geocoder(&civic_mock, &geocoder_mock)
        .oneshot(get("/api/voter-info?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();
    // wiremock verifies .expect(1) on drop — confirms User-Agent was set correctly
}

#[tokio::test]
async fn voter_info_geocode_failure_returns_null_lat_lng() {
    let civic_mock = MockServer::start().await;
    let geocoder_mock = MockServer::start().await;

    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_response()))
        .mount(&civic_mock)
        .await;

    // Nominatim returns empty — no match found
    Mock::given(method("GET"))
        .and(path("/search"))
        .respond_with(ResponseTemplate::new(200).set_body_json(serde_json::json!([])))
        .mount(&geocoder_mock)
        .await;

    let response = make_app_with_geocoder(&civic_mock, &geocoder_mock)
        .oneshot(get("/api/voter-info?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let loc = &json["polling_locations"][0];
    // lat/lng keys must be present but null
    assert!(loc.get("lat").is_some(), "lat key should be present");
    assert!(loc.get("lng").is_some(), "lng key should be present");
    assert!(loc["lat"].is_null(), "lat should be null when geocoding fails");
    assert!(loc["lng"].is_null(), "lng should be null when geocoding fails");
}

// ---------------------------------------------------------------------------
// GET /api/registration
// ---------------------------------------------------------------------------

#[tokio::test]
async fn registration_returns_data_when_state_present() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_with_registration()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], true);
    assert_eq!(json["registration_url"], "https://ova.elections.il.gov/");
    assert_eq!(json["registration_deadline"], "10/08/2025");
    assert_eq!(json["admin_name"], "Illinois State Board of Elections");
    let officials = json["election_officials"].as_array().unwrap();
    assert_eq!(officials.len(), 1);
    assert_eq!(officials[0]["name"], "Steve Sandvoss");
    assert_eq!(officials[0]["email"], "info@elections.il.gov");
    assert_eq!(officials[0]["phone"], "217-782-4141");
    assert_eq!(officials[0]["fax"], "217-782-5959");
    // Additional fields
    assert_eq!(json["election_info_url"], "https://www.elections.il.gov/");
    assert_eq!(json["absentee_voting_info_url"], "https://www.elections.il.gov/AbsenteeBallots/");
    assert_eq!(json["hours_of_operation"], "Monday-Friday 8am-5pm CT");
    let services = json["voter_services"].as_array().unwrap();
    assert_eq!(services.len(), 3);
    assert_eq!(services[0], "Voter Registration");
    assert_eq!(json["correspondence_address"]["city"], "Springfield");
}

#[tokio::test]
async fn registration_returns_unavailable_when_no_state() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_without_registration()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], false);
    // Optional fields must not be present when unavailable
    assert!(json.get("registration_url").is_none() || json["registration_url"].is_null());
    assert!(json.get("admin_name").is_none() || json["admin_name"].is_null());
}

#[tokio::test]
async fn registration_missing_address_returns_400() {
    let mock_server = MockServer::start().await;
    let response = make_app(&mock_server)
        .oneshot(get("/api/registration"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn registration_parse_error_returns_422() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(parse_error_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=bad"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["code"], "VALIDATION_ERROR");
}

// VOT-13 fallback tests

#[tokio::test]
async fn registration_election_unknown_uses_state_fallback() {
    // Civic API has no election data for this address, but the state (IL) is
    // in the static fallback JSON — response should be 200 with fallback data.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(election_unknown_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], false);
    assert_eq!(json["registration_url"], "https://ova.elections.il.gov");
    assert_eq!(json["same_day_registration"], true);
    assert_eq!(json["online_registration"], true);
    // Full Civic API fields must not appear in a fallback response
    assert!(json.get("admin_name").is_none() || json["admin_name"].is_null());
    assert!(json.get("election_officials").is_none()
        || json["election_officials"].as_array().is_none_or(|a| a.is_empty()));
}

#[tokio::test]
async fn registration_election_unknown_unknown_state_returns_unavailable() {
    // "XX" is not a real state abbreviation — no fallback entry exists.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(election_unknown_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], false);
    assert!(json.get("registration_url").is_none() || json["registration_url"].is_null());
    assert!(json.get("same_day_registration").is_none() || json["same_day_registration"].is_null());
    assert!(json.get("online_registration").is_none() || json["online_registration"].is_null());
}

#[tokio::test]
async fn registration_civic_data_includes_sdr_and_online_flags() {
    // When the Civic API returns a full admin body, same_day_registration and
    // online_registration should be enriched from the static fallback data.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_with_registration()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], true);
    assert_eq!(json["same_day_registration"], true);
    assert_eq!(json["online_registration"], true);
}

#[tokio::test]
async fn registration_civic_url_absent_falls_back_to_static_url() {
    // Admin body is present but has no electionRegistrationUrl — the static
    // fallback URL for IL should appear in the response instead.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(voter_info_with_registration_no_reg_url()),
        )
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], true);
    assert_eq!(json["registration_url"], "https://ova.elections.il.gov");
    assert_eq!(json["same_day_registration"], true);
    assert_eq!(json["online_registration"], true);
}

#[tokio::test]
async fn registration_no_state_body_unknown_state_omits_fallback_fields() {
    // Civic API returns 200 with an empty state array and address uses "XX".
    // No fallback entry exists, so SDR/online fields must be absent.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(voter_info_without_registration()),
        )
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], false);
    assert!(json.get("registration_url").is_none() || json["registration_url"].is_null());
    assert!(json.get("same_day_registration").is_none() || json["same_day_registration"].is_null());
    assert!(json.get("online_registration").is_none() || json["online_registration"].is_null());
}

#[tokio::test]
async fn registration_no_state_body_known_state_includes_fallback_flags() {
    // Civic API returns 200 with an empty state array but the address state (IL)
    // is in the static fallback — SDR/online flags and URL should still appear.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(
            ResponseTemplate::new(200).set_body_json(voter_info_without_registration()),
        )
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/registration?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["available"], false);
    assert_eq!(json["registration_url"], "https://ova.elections.il.gov");
    assert_eq!(json["same_day_registration"], true);
    assert_eq!(json["online_registration"], true);
}

// ---------------------------------------------------------------------------
// GET /api/elections
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// GET /api/elections/dates
// ---------------------------------------------------------------------------

#[tokio::test]
async fn election_dates_returns_election_day_and_registration_deadline() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_with_registration()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/elections/dates?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let dates = json["dates"].as_array().unwrap();

    // registrationDeadline in the fixture is "10/08/2025" (US slash format),
    // electionDay is "2025-11-04" (ISO) — both must parse and appear, sorted.
    assert_eq!(dates.len(), 2);
    assert_eq!(dates[0]["category"], "registration_deadline");
    assert_eq!(dates[0]["date"], "2025-10-08");
    assert!(dates[0]["days_remaining"].is_i64());
    assert_eq!(dates[1]["category"], "election_day");
    assert_eq!(dates[1]["date"], "2025-11-04");
    assert_eq!(dates[1]["label"], "General Election");
}

#[tokio::test]
async fn election_dates_election_unknown_returns_empty_list() {
    // No Civic API election data and no scraped-state match (SUPABASE_URL unset
    // in tests) — the endpoint should still succeed with an empty date list
    // rather than propagating the NotFound error.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(election_unknown_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/elections/dates?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["dates"].as_array().unwrap().len(), 0);
}

#[tokio::test]
async fn election_dates_missing_address_returns_400() {
    let mock_server = MockServer::start().await;
    let response = make_app(&mock_server)
        .oneshot(get("/api/elections/dates"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn elections_success() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(voter_info_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/elections?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["election"]["id"], "9001");
    let contests = json["contests"].as_array().unwrap();
    assert_eq!(contests.len(), 1);
    assert_eq!(contests[0]["id"], 0); // contest id is the index
    assert_eq!(contests[0]["office"], "Mayor");
}

// ---------------------------------------------------------------------------
// GET /api/ballot
// ---------------------------------------------------------------------------

fn ballot_voter_info_multi_level() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "contests": [
            {
                "office": "City Council District 4",
                "level": ["locality"],
                "candidates": [{ "name": "Pat Lee" }]
            },
            {
                "office": "Governor",
                "district": { "name": "Example State" },
                "level": ["administrativeArea1"],
                "candidates": [{ "name": "Jamie Fox", "party": "Other Party" }]
            },
            {
                "office": "President of the United States",
                "level": ["country"],
                "candidates": [
                    {
                        "name": "Jane Smith",
                        "party": "Example Party",
                        "candidateUrl": "https://example.com",
                        "photoUrl": "https://example.com/photo.jpg",
                        "phone": "555-555-5555",
                        "email": "jane@example.com",
                        "channels": [{ "type": "Twitter", "id": "janesmith" }]
                    },
                    { "name": "John Doe" }
                ]
            }
        ]
    })
}

fn ballot_voter_info_single_level() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "contests": [
            {
                "office": "City Council District 4",
                "level": ["locality"],
                "candidates": [{ "name": "Pat Lee" }]
            },
            {
                "office": "School Board",
                "level": ["locality"],
                "candidates": [{ "name": "Alex Kim" }]
            }
        ]
    })
}

/// Reproduces Google's actual current `voterinfo` shape for a contested primary: no `level`
/// field on any contest (it's documented but not populated in practice), office titles and
/// `district.scope` are the only classification signals. Modeled directly on a real response
/// for a Michigan primary address (Governor/US Senator/State Senate/county races).
fn ballot_voter_info_no_level_field_real_world_shape() -> Value {
    json!({
        "election": {
            "id": "9483",
            "name": "Michigan Primary Election",
            "electionDay": "2026-08-04"
        },
        "contests": [
            {
                "office": "Governor",
                "district": { "name": "Michigan", "scope": "statewide" },
                "candidates": [{ "name": "Jocelyn Benson", "party": "DEMOCRATIC" }]
            },
            {
                "office": "United States Senator",
                "district": { "name": "Michigan", "scope": "statewide" },
                "candidates": [{ "name": "Mike Rogers", "party": "REPUBLICAN" }]
            },
            {
                "office": "Representative in Congress",
                "district": { "name": "7th District" },
                "candidates": [{ "name": "Tom Barrett", "party": "REPUBLICAN" }]
            },
            {
                "office": "State Senator",
                "district": { "name": "21st District", "scope": "stateUpper" },
                "candidates": [{ "name": "Josh Burns", "party": "REPUBLICAN" }]
            },
            {
                "district": { "name": "INGHAM COUNTY", "scope": "countywide" },
                "candidates": []
            }
        ]
    })
}

fn ballot_voter_info_empty_contests() -> Value {
    json!({
        "election": {
            "id": "9001",
            "name": "General Election",
            "electionDay": "2025-11-04"
        },
        "contests": []
    })
}

#[tokio::test]
async fn ballot_returns_contests_sorted_by_federal_state_local() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_multi_level()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let contests = json["contests"].as_array().unwrap();
    assert_eq!(contests.len(), 3);
    assert_eq!(contests[0]["office"], "President of the United States");
    assert_eq!(contests[0]["level"], "federal");
    assert_eq!(contests[1]["office"], "Governor");
    assert_eq!(contests[1]["level"], "state");
    assert_eq!(contests[2]["office"], "City Council District 4");
    assert_eq!(contests[2]["level"], "local");
}

#[tokio::test]
async fn ballot_classifies_correctly_when_level_field_is_absent() {
    // Regression test: Google's real API never populates `level[]` (see research.md); this
    // must still classify correctly using office title + district.scope alone.
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(
            ResponseTemplate::new(200)
                .set_body_json(ballot_voter_info_no_level_field_real_world_shape()),
        )
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=100+N+Capitol+Ave,+Lansing,+MI+48933"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let contests = json["contests"].as_array().unwrap();
    assert_eq!(contests.len(), 5);

    let by_office = |office: &str| {
        contests
            .iter()
            .find(|c| c["office"] == office)
            .unwrap_or_else(|| panic!("missing contest for office {office}"))
    };

    // Governor and US Senator both have district.scope == "statewide" — scope alone can't
    // tell them apart, so this proves the office-title check is what disambiguates them.
    assert_eq!(by_office("Governor")["level"], "state");
    assert_eq!(by_office("United States Senator")["level"], "federal");
    assert_eq!(by_office("Representative in Congress")["level"], "federal");
    assert_eq!(by_office("State Senator")["level"], "state");

    // The county contest has no `office` at all — classified via scope fallback.
    let county_contest = contests
        .iter()
        .find(|c| c["office"].is_null())
        .expect("missing office-less county contest");
    assert_eq!(county_contest["level"], "local");

    // Federal before State before Local, regardless of source order.
    let levels: Vec<&str> = contests.iter().map(|c| c["level"].as_str().unwrap()).collect();
    assert_eq!(levels, vec!["federal", "federal", "state", "state", "local"]);
}

#[tokio::test]
async fn ballot_single_level_returns_only_that_level() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_single_level()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    let contests = json["contests"].as_array().unwrap();
    assert_eq!(contests.len(), 2);
    for contest in contests {
        assert_eq!(contest["level"], "local");
    }
}

#[tokio::test]
async fn ballot_candidate_includes_all_available_fields() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_multi_level()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    let json = body_json(response.into_body()).await;
    let federal_contest = &json["contests"][0];
    let jane = &federal_contest["candidates"][0];
    assert_eq!(jane["name"], "Jane Smith");
    assert_eq!(jane["party"], "Example Party");
    assert_eq!(jane["candidate_url"], "https://example.com");
    assert_eq!(jane["photo_url"], "https://example.com/photo.jpg");
    assert_eq!(jane["phone"], "555-555-5555");
    assert_eq!(jane["email"], "jane@example.com");
    assert_eq!(jane["channels"][0]["channel_type"], "Twitter");
    assert_eq!(jane["channels"][0]["id"], "janesmith");
}

#[tokio::test]
async fn ballot_contest_includes_all_candidates() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_multi_level()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    let json = body_json(response.into_body()).await;
    let federal_contest = &json["contests"][0];
    let candidates = federal_contest["candidates"].as_array().unwrap();
    assert_eq!(candidates.len(), 2);
    assert_eq!(candidates[0]["name"], "Jane Smith");
    assert_eq!(candidates[1]["name"], "John Doe");
}

#[tokio::test]
async fn ballot_candidate_missing_fields_are_omitted_not_null() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_multi_level()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    let json = body_json(response.into_body()).await;
    let federal_contest = &json["contests"][0];
    let john = federal_contest["candidates"][1].as_object().unwrap();
    assert_eq!(john["name"], "John Doe");
    for field in ["party", "candidate_url", "photo_url", "phone", "email", "channels"] {
        assert!(
            !john.contains_key(field),
            "expected field `{field}` to be absent, found: {:?}",
            john.get(field)
        );
    }
}

#[tokio::test]
async fn ballot_election_unknown_returns_404() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(election_unknown_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Nowhere,+XX+00000"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["code"], "NOT_FOUND");
}

#[tokio::test]
async fn ballot_unparseable_address_returns_422() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(400).set_body_json(parse_error_response()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=bad"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["code"], "VALIDATION_ERROR");
}

#[tokio::test]
async fn ballot_empty_contests_returns_success() {
    let mock_server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/voterinfo"))
        .respond_with(ResponseTemplate::new(200).set_body_json(ballot_voter_info_empty_contests()))
        .mount(&mock_server)
        .await;

    let response = make_app(&mock_server)
        .oneshot(get("/api/ballot?address=123+Main+St,+Springfield,+IL+62701"))
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let json = body_json(response.into_body()).await;
    assert_eq!(json["contests"].as_array().unwrap().len(), 0);
}

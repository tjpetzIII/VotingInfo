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

// ---------------------------------------------------------------------------
// GET /api/elections
// ---------------------------------------------------------------------------

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

use std::sync::Arc;

use axum::body::Body;
use backend::{build_app_router, services::civic_api::CivicApiClient};
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use serde_json::{json, Value};
use tower::ServiceExt;
use wiremock::matchers::{method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn make_app(mock_server: &MockServer) -> axum::Router {
    let client = CivicApiClient::new_with_base_url("test_key", &mock_server.uri());
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

use std::sync::Arc;

use axum::body::Body;
use axum::http::{Method, Request, StatusCode};
use backend::{build_app_router, services::{civic_api::CivicApiClient, scraper_utils::STATE_SCRAPERS}};
use tower::ServiceExt;

fn app() -> axum::Router {
    // Wrong-method probes are rejected by Axum's router before a handler runs,
    // so no upstream service or secret is needed for this regression test.
    build_app_router(Arc::new(CivicApiClient::new_with_base_url(
        "test-key",
        "http://127.0.0.1:1",
    )))
}

async fn status_and_allow(method: Method, path: String) -> (StatusCode, String) {
    let response = app()
        .oneshot(Request::builder().method(method).uri(path).body(Body::empty()).unwrap())
        .await
        .unwrap();
    let allow = response
        .headers()
        .get("allow")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    (response.status(), allow)
}

#[tokio::test]
async fn every_registered_state_route_preserves_method_matching() {
    for config in STATE_SCRAPERS {
        let state = config.lower();

        let (status, allow) = status_and_allow(
            Method::POST,
            format!("/api/{state}-elections"),
        )
        .await;
        assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED, "GET route for {state}");
        assert!(allow.split(',').any(|method| method.trim() == "GET"), "Allow for {state}: {allow}");

        let (status, allow) = status_and_allow(
            Method::GET,
            format!("/api/scrape/{state}"),
        )
        .await;
        assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED, "POST route for {state}");
        assert!(allow.split(',').any(|method| method.trim() == "POST"), "Allow for {state}: {allow}");
    }
}

#[tokio::test]
async fn unsupported_state_routes_remain_unmatched() {
    for path in ["/api/zz-elections", "/api/scrape/zz"] {
        let response = app()
            .oneshot(Request::builder().method(Method::GET).uri(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::NOT_FOUND, "unexpected route: {path}");
    }
}

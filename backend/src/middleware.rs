use axum::{
    extract::Request,
    middleware::Next,
    response::{IntoResponse, Response},
};
use std::time::Instant;
use tower_governor::GovernorError;

/// Convert governor rejections to the same typed JSON contract as handler errors.
pub fn governor_error_response(error: GovernorError) -> Response {
    let mut response = crate::errors::AppError::RateLimited.into_response();
    let governor_response = error.into_response();
    for (name, value) in governor_response.headers() {
        response.headers_mut().insert(name, value.clone());
    }
    response
}

pub async fn log_request(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let start = Instant::now();

    let response = next.run(req).await;

    let status = response.status().as_u16();
    let duration_ms = start.elapsed().as_millis();

    tracing::info!(
        method = %method,
        path = %path,
        status = status,
        duration_ms = duration_ms,
        "request"
    );

    response
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;
    use http_body_util::BodyExt;

    #[tokio::test]
    async fn governor_rejection_is_typed_json() {
        let response = governor_error_response(GovernorError::TooManyRequests {
            wait_time: 2,
            headers: None,
        });
        assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["code"], "RATE_LIMITED");
        assert_eq!(json["error"], "Too many requests");
    }
}

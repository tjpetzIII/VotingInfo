use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;

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

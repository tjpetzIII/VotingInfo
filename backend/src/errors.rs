use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("HTTP request failed: {0}")]
    Reqwest(#[from] reqwest::Error),
    #[error("External API error ({status}): {message}")]
    ExternalApiError { status: u16, message: String },
    #[error("No active election found for this address. Check back closer to an election date.")]
    NotFound,
    #[error("Missing environment variable: {0}")]
    Config(String),
    #[error("Invalid request: {0}")]
    ValidationError(String),
    #[error("Rate limit exceeded. Please wait before retrying.")]
    RateLimited,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "NOT_FOUND", self.to_string()),
            AppError::ValidationError(_) => {
                (StatusCode::UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", self.to_string())
            }
            AppError::RateLimited => {
                (StatusCode::TOO_MANY_REQUESTS, "RATE_LIMITED", self.to_string())
            }
            AppError::ExternalApiError { .. } => {
                (StatusCode::BAD_GATEWAY, "EXTERNAL_API_ERROR", self.to_string())
            }
            AppError::Reqwest(_) => (StatusCode::BAD_GATEWAY, "EXTERNAL_API_ERROR", self.to_string()),
            AppError::Config(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "CONFIG_ERROR", self.to_string())
            }
        };
        (status, Json(json!({ "error": message, "code": code }))).into_response()
    }
}

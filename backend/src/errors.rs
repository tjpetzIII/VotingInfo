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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    fn status(err: AppError) -> StatusCode {
        err.into_response().status()
    }

    #[test]
    fn not_found_is_404() {
        assert_eq!(status(AppError::NotFound), StatusCode::NOT_FOUND);
    }

    #[test]
    fn validation_error_is_422() {
        assert_eq!(
            status(AppError::ValidationError("bad address".into())),
            StatusCode::UNPROCESSABLE_ENTITY
        );
    }

    #[test]
    fn rate_limited_is_429() {
        assert_eq!(status(AppError::RateLimited), StatusCode::TOO_MANY_REQUESTS);
    }

    #[test]
    fn external_api_error_is_502() {
        assert_eq!(
            status(AppError::ExternalApiError { status: 403, message: "forbidden".into() }),
            StatusCode::BAD_GATEWAY
        );
    }

    #[test]
    fn config_error_is_500() {
        assert_eq!(
            status(AppError::Config("MISSING_KEY".into())),
            StatusCode::INTERNAL_SERVER_ERROR
        );
    }
}

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
    #[error("Too many requests")]
    RateLimited,
    #[error("Scraper failed to parse page: {0}")]
    ScraperError(String),
    #[error("Invalid election ID. Please choose an election from the list.")]
    InvalidElectionId,
    #[error("The selected election is unavailable for this address.")]
    ElectionUnavailable,
    #[error("Please choose an election before continuing.")]
    ElectionSelectionRequired,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::NotFound => (StatusCode::NOT_FOUND, "NOT_FOUND", self.to_string()),
            AppError::ValidationError(_) => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "VALIDATION_ERROR",
                self.to_string(),
            ),
            AppError::RateLimited => (
                StatusCode::TOO_MANY_REQUESTS,
                "RATE_LIMITED",
                self.to_string(),
            ),
            AppError::ExternalApiError { .. } => (
                StatusCode::BAD_GATEWAY,
                "EXTERNAL_API_ERROR",
                "The external service is temporarily unavailable.".to_string(),
            ),
            AppError::Reqwest(_) => (
                StatusCode::BAD_GATEWAY,
                "EXTERNAL_API_ERROR",
                "The external service is temporarily unavailable.".to_string(),
            ),
            AppError::Config(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "CONFIG_ERROR",
                "The service is temporarily unavailable.".to_string(),
            ),
            AppError::ScraperError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "SCRAPER_ERROR",
                "Election information is temporarily unavailable.".to_string(),
            ),
            AppError::InvalidElectionId => (
                StatusCode::UNPROCESSABLE_ENTITY,
                "INVALID_ELECTION_ID",
                self.to_string(),
            ),
            AppError::ElectionUnavailable => (
                StatusCode::NOT_FOUND,
                "ELECTION_UNAVAILABLE",
                self.to_string(),
            ),
            AppError::ElectionSelectionRequired => (
                StatusCode::CONFLICT,
                "ELECTION_SELECTION_REQUIRED",
                self.to_string(),
            ),
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
            status(AppError::ExternalApiError {
                status: 403,
                message: "forbidden".into()
            }),
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

    #[tokio::test]
    async fn upstream_details_are_not_sent_to_clients() {
        use http_body_util::BodyExt;

        let response = AppError::ExternalApiError {
            status: 403,
            message: "api_key=secret-value https://example.test/private".into(),
        }
        .into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body = String::from_utf8(body.to_vec()).unwrap();

        assert!(!body.contains("secret-value"));
        assert!(!body.contains("example.test"));
        assert!(body.contains("EXTERNAL_API_ERROR"));
    }

    #[tokio::test]
    async fn transport_details_are_not_sent_to_clients() {
        use http_body_util::BodyExt;

        let response = AppError::Reqwest(
            reqwest::Client::new()
                .get("http://[::1")
                .build()
                .unwrap_err(),
        )
        .into_response();
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let body = String::from_utf8(body.to_vec()).unwrap();

        assert!(!body.contains("secret-value"));
        assert!(body.contains("EXTERNAL_API_ERROR"));
    }
}

use crate::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use url::form_urlencoded::byte_serialize;

#[derive(Debug, Deserialize)]
pub struct SubscribeRequest {
    pub email: String,
    pub address: String,
    pub consent: bool,
}
#[derive(Debug, Serialize)]
pub struct SubscribeResponse {
    pub status: &'static str,
    pub unsubscribe_url: String,
}

pub async fn subscribe(
    State(state): State<AppState>,
    Json(req): Json<SubscribeRequest>,
) -> Result<(StatusCode, Json<SubscribeResponse>), (StatusCode, Json<serde_json::Value>)> {
    if !req.consent {
        return Err((
            StatusCode::UNPROCESSABLE_ENTITY,
            Json(serde_json::json!({"code":"CONSENT_REQUIRED"})),
        ));
    }
    let service = state.notifications.clone();
    let subscriber = service
        .subscribe(&req.email, &req.address, &chrono::Utc::now().to_rfc3339())
        .map_err(|_| {
            (
                StatusCode::UNPROCESSABLE_ENTITY,
                Json(serde_json::json!({"code":"VALIDATION_ERROR"})),
            )
        })?;
    let email = byte_serialize(subscriber.email.as_bytes()).collect::<String>();
    let token = byte_serialize(subscriber.unsubscribe_token.as_bytes()).collect::<String>();
    let unsubscribe_url = format!("https://voteready.example/api/reminders/unsubscribe?email={email}&token={token}");
    let body = format!("You are signed up for election reminders. Unsubscribe: {unsubscribe_url}");
    service
        .send(&subscriber.email, "VoteReady election reminders", &body)
        .map_err(|_| {
            (
                StatusCode::BAD_GATEWAY,
                Json(serde_json::json!({"code":"EMAIL_PROVIDER_ERROR"})),
            )
        })?;
    Ok((
        StatusCode::CREATED,
        Json(SubscribeResponse {
            status: "subscribed",
            unsubscribe_url,
        }),
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::notifications::TestEmailProvider;
    #[test]
    fn confirmation_contains_unsubscribe() {
        let s = NotificationService::new(TestEmailProvider::default());
        let item = s.subscribe("a@b.test", "1 Main", "now").unwrap();
        assert!(!item.unsubscribe_token.is_empty());
    }
}

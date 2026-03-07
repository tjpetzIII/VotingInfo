use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::errors::AppError;
use crate::models::VoterInfoResponse;
use crate::services::civic_api::CivicApiClient;

#[derive(Deserialize)]
pub struct VoterInfoQuery {
    address: String,
}

pub async fn get_voter_info(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<VoterInfoQuery>,
) -> Result<Json<VoterInfoResponse>, AppError> {
    let info = client.get_voter_info(&params.address).await?;
    Ok(Json(info))
}

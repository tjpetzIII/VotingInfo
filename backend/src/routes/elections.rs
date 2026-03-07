use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::errors::AppError;
use crate::models::{AllElectionsResponse, ElectionsResponse, RegistrationResponse, VoterInfoResponse};
use crate::services::civic_api::CivicApiClient;

#[derive(Deserialize)]
pub struct AddressQuery {
    address: String,
}

pub async fn get_voter_info(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<VoterInfoResponse>, AppError> {
    let info = client.get_voter_info(&params.address).await?;
    Ok(Json(info))
}

pub async fn get_elections(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<ElectionsResponse>, AppError> {
    let info = client.get_elections(&params.address).await?;
    Ok(Json(info))
}

pub async fn list_all_elections(
    State(client): State<Arc<CivicApiClient>>,
) -> Result<Json<AllElectionsResponse>, AppError> {
    let info = client.get_all_elections().await?;
    Ok(Json(info))
}

pub async fn get_registration(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<RegistrationResponse>, AppError> {
    let info = client.get_registration(&params.address).await?;
    Ok(Json(info))
}

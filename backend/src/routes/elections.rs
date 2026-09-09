use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;

use crate::errors::AppError;
use crate::models::{
    AllElectionsResponse, BallotResponse, ElectionChoicesResponse, ElectionDatesResponse,
    ElectionsResponse, RegistrationResponse, VoterInfoResponse,
};
use crate::services::civic_api::CivicApiClient;
use crate::services::election_dates;
use crate::AppState;

#[derive(Deserialize)]
pub struct AddressQuery {
    address: String,
    #[serde(default, alias = "electionId")]
    election_id: Option<String>,
}

pub async fn get_election_choices(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<ElectionChoicesResponse>, AppError> {
    Ok(Json(client.get_election_choices(&params.address).await?))
}

pub async fn get_voter_info(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<VoterInfoResponse>, AppError> {
    let info = client
        .get_voter_info(&params.address, params.election_id.as_deref())
        .await?;
    Ok(Json(info))
}

pub async fn get_elections(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<ElectionsResponse>, AppError> {
    let info = client
        .get_elections(&params.address, params.election_id.as_deref())
        .await?;
    Ok(Json(info))
}

pub async fn list_all_elections(
    State(client): State<Arc<CivicApiClient>>,
) -> Result<Json<AllElectionsResponse>, AppError> {
    let info = client.get_all_elections().await?;
    Ok(Json(info))
}

pub async fn get_ballot(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<BallotResponse>, AppError> {
    let info = client
        .get_ballot(&params.address, params.election_id.as_deref())
        .await?;
    Ok(Json(info))
}

pub async fn get_registration(
    State(client): State<Arc<CivicApiClient>>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<RegistrationResponse>, AppError> {
    let info = client
        .get_registration(&params.address, params.election_id.as_deref())
        .await?;
    Ok(Json(info))
}

pub async fn get_election_dates(
    State(state): State<AppState>,
    Query(params): Query<AddressQuery>,
) -> Result<Json<ElectionDatesResponse>, AppError> {
    let info = election_dates::get_election_dates(
        &state.civic,
        &state.supabase,
        &params.address,
        params.election_id.as_deref(),
    )
    .await?;
    Ok(Json(info))
}

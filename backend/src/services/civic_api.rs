use std::env;
use std::time::Duration;

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;

use crate::errors::AppError;
use crate::models::{Candidate, Contest, Election, PollingLocation, VoterInfoResponse};

const CIVIC_API_BASE: &str = "https://www.googleapis.com/civicinfo/v2";

// Raw deserialization types that match Google's JSON shape exactly.

#[derive(Deserialize)]
struct ApiElection {
    id: String,
    name: String,
    #[serde(rename = "electionDay")]
    election_day: String,
}

#[derive(Deserialize)]
struct ApiAddress {
    #[serde(rename = "locationName")]
    location_name: Option<String>,
    line1: Option<String>,
    city: Option<String>,
    state: Option<String>,
    zip: Option<String>,
}

#[derive(Deserialize)]
struct ApiPollingLocation {
    address: Option<ApiAddress>,
    #[serde(rename = "pollingHours")]
    polling_hours: Option<String>,
}

#[derive(Deserialize)]
struct ApiCandidate {
    name: String,
    party: Option<String>,
}

#[derive(Deserialize)]
struct ApiDistrict {
    name: Option<String>,
}

#[derive(Deserialize)]
struct ApiContest {
    office: Option<String>,
    district: Option<ApiDistrict>,
    #[serde(default)]
    candidates: Vec<ApiCandidate>,
}

#[derive(Deserialize)]
struct ApiVoterInfoResponse {
    election: ApiElection,
    #[serde(rename = "pollingLocations", default)]
    polling_locations: Vec<ApiPollingLocation>,
    #[serde(default)]
    contests: Vec<ApiContest>,
}

pub struct CivicApiClient {
    client: Client,
    api_key: String,
    cache: Cache<String, VoterInfoResponse>,
}

impl CivicApiClient {
    pub fn new() -> Result<Self, AppError> {
        let api_key = env::var("GOOGLE_CIVIC_API_KEY")
            .map_err(|_| AppError::Config("GOOGLE_CIVIC_API_KEY".to_string()))?;

        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(15 * 60))
            .build();

        Ok(Self {
            client: Client::new(),
            api_key,
            cache,
        })
    }

    pub async fn get_voter_info(&self, address: &str) -> Result<VoterInfoResponse, AppError> {
        if let Some(cached) = self.cache.get(address).await {
            return Ok(cached);
        }

        let response = self
            .client
            .get(format!("{CIVIC_API_BASE}/voterinfo"))
            .query(&[("address", address), ("key", &self.api_key)])
            .send()
            .await?;

        let status = response.status();

        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::NotFound);
        }

        if !status.is_success() {
            let message = response.text().await.unwrap_or_default();
            return Err(AppError::ApiError {
                status: status.as_u16(),
                message,
            });
        }

        let raw: ApiVoterInfoResponse = response.json().await?;
        let result = map_response(raw);

        self.cache.insert(address.to_string(), result.clone()).await;

        Ok(result)
    }
}

fn map_response(raw: ApiVoterInfoResponse) -> VoterInfoResponse {
    VoterInfoResponse {
        election: Election {
            id: raw.election.id,
            name: raw.election.name,
            election_day: raw.election.election_day,
        },
        polling_locations: raw
            .polling_locations
            .into_iter()
            .map(|loc| {
                let (address, location_name) = match loc.address {
                    Some(addr) => {
                        let parts: Vec<String> = [
                            addr.line1,
                            addr.city,
                            addr.state,
                            addr.zip,
                        ]
                        .into_iter()
                        .flatten()
                        .collect();
                        let address = if parts.is_empty() {
                            None
                        } else {
                            Some(parts.join(", "))
                        };
                        (address, addr.location_name)
                    }
                    None => (None, None),
                };
                PollingLocation {
                    name: None,
                    address,
                    hours: loc.polling_hours,
                    location_name,
                }
            })
            .collect(),
        contests: raw
            .contests
            .into_iter()
            .map(|c| Contest {
                office: c.office,
                district: c.district.and_then(|d| d.name),
                candidates: c
                    .candidates
                    .into_iter()
                    .map(|cand| Candidate {
                        name: cand.name,
                        party: cand.party,
                    })
                    .collect(),
            })
            .collect(),
    }
}

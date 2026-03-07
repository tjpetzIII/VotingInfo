use std::env;
use std::time::Duration;

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;

use crate::errors::AppError;
use crate::models::{
    AllElectionsResponse, Candidate, CandidateDetail, Channel, Contest, ContestDetail, Election,
    ElectionItem, ElectionOfficial, ElectionsResponse, PollingLocation, RegistrationAddress,
    RegistrationResponse, VoterInfoResponse,
};
use crate::services::geocoder::GeocoderClient;

const CIVIC_API_BASE: &str = "https://www.googleapis.com/civicinfo/v2";


// Raw deserialization types that match Google's JSON shape exactly.

#[derive(Deserialize)]
struct ApiElectionItem {
    id: String,
    name: String,
    #[serde(rename = "electionDay")]
    election_day: String,
    #[serde(rename = "ocdDivisionId")]
    ocd_division_id: Option<String>,
}

#[derive(Deserialize)]
struct ApiElectionsQueryResponse {
    #[serde(default)]
    elections: Vec<ApiElectionItem>,
}

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
struct ApiChannel {
    #[serde(rename = "type")]
    channel_type: String,
    id: String,
}

#[derive(Deserialize)]
struct ApiCandidate {
    name: String,
    party: Option<String>,
    #[serde(rename = "candidateUrl")]
    candidate_url: Option<String>,
    #[serde(rename = "photoUrl")]
    photo_url: Option<String>,
    phone: Option<String>,
    email: Option<String>,
    #[serde(default)]
    channels: Vec<ApiChannel>,
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
struct ApiElectionOfficial {
    name: Option<String>,
    title: Option<String>,
    #[serde(rename = "emailAddress")]
    email_address: Option<String>,
    #[serde(rename = "officePhoneNumber")]
    office_phone_number: Option<String>,
    #[serde(rename = "faxNumber")]
    fax_number: Option<String>,
}

#[derive(Deserialize)]
struct ApiSimpleAddress {
    #[serde(rename = "locationName")]
    location_name: Option<String>,
    line1: Option<String>,
    city: Option<String>,
    state: Option<String>,
    zip: Option<String>,
}

#[derive(Deserialize)]
struct ApiElectionAdministrationBody {
    name: Option<String>,
    #[serde(rename = "electionInfoUrl")]
    election_info_url: Option<String>,
    #[serde(rename = "electionRegistrationUrl")]
    election_registration_url: Option<String>,
    #[serde(rename = "electionRegistrationConfirmationUrl")]
    election_registration_confirmation_url: Option<String>,
    #[serde(rename = "absenteeVotingInfoUrl")]
    absentee_voting_info_url: Option<String>,
    #[serde(rename = "votingLocationFinderUrl")]
    voting_location_finder_url: Option<String>,
    #[serde(rename = "ballotInfoUrl")]
    ballot_info_url: Option<String>,
    #[serde(rename = "electionRulesUrl")]
    election_rules_url: Option<String>,
    voter_services: Option<String>,
    #[serde(rename = "hoursOfOperation")]
    hours_of_operation: Option<String>,
    #[serde(rename = "registrationDeadline")]
    registration_deadline: Option<String>,
    #[serde(rename = "correspondenceAddress")]
    correspondence_address: Option<ApiSimpleAddress>,
    #[serde(rename = "physicalAddress")]
    physical_address: Option<ApiSimpleAddress>,
    #[serde(rename = "electionOfficials", default)]
    election_officials: Vec<ApiElectionOfficial>,
}

#[derive(Deserialize)]
struct ApiAdministrationRegion {
    #[serde(rename = "electionAdministrationBody")]
    election_administration_body: Option<ApiElectionAdministrationBody>,
}

#[derive(Deserialize)]
struct ApiVoterInfoResponse {
    election: ApiElection,
    #[serde(rename = "pollingLocations", default)]
    polling_locations: Vec<ApiPollingLocation>,
    #[serde(default)]
    contests: Vec<ApiContest>,
    #[serde(default)]
    state: Vec<ApiAdministrationRegion>,
}

pub struct CivicApiClient {
    client: Client,
    api_key: String,
    base_url: String,
    cache: Cache<String, VoterInfoResponse>,
    elections_cache: Cache<String, ElectionsResponse>,
    all_elections_cache: Cache<String, AllElectionsResponse>,
    registration_cache: Cache<String, RegistrationResponse>,
    geocoder: GeocoderClient,
}

impl CivicApiClient {
    pub fn new() -> Result<Self, AppError> {
        let api_key = env::var("GOOGLE_CIVIC_API_KEY")
            .map_err(|_| AppError::Config("GOOGLE_CIVIC_API_KEY".to_string()))?;
        Ok(Self::build(api_key, CIVIC_API_BASE.to_string(), GeocoderClient::new()))
    }

    /// Constructs a client pointing at a custom base URL. Used in tests to redirect
    /// requests to a mock server instead of the real Google Civic API.
    pub fn new_with_base_url(api_key: &str, base_url: &str) -> Self {
        Self::build(api_key.to_string(), base_url.to_string(), GeocoderClient::new())
    }

    /// Constructs a client with custom base URLs for both the Civic API and Nominatim.
    /// Used in tests that also need to mock geocoding.
    pub fn new_with_urls(api_key: &str, civic_base_url: &str, geocoder_base_url: &str) -> Self {
        Self::build(
            api_key.to_string(),
            civic_base_url.to_string(),
            GeocoderClient::new_with_base_url(geocoder_base_url),
        )
    }

    fn build(api_key: String, base_url: String, geocoder: GeocoderClient) -> Self {
        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(15 * 60))
            .build();

        let elections_cache = Cache::builder()
            .time_to_live(Duration::from_secs(15 * 60))
            .build();

        let all_elections_cache = Cache::builder()
            .time_to_live(Duration::from_secs(15 * 60))
            .build();

        let registration_cache = Cache::builder()
            .time_to_live(Duration::from_secs(15 * 60))
            .build();

        Self {
            client: Client::new(),
            api_key,
            base_url,
            cache,
            elections_cache,
            all_elections_cache,
            registration_cache,
            geocoder,
        }
    }

    pub async fn get_voter_info(&self, address: &str) -> Result<VoterInfoResponse, AppError> {
        if let Some(cached) = self.cache.get(address).await {
            return Ok(cached);
        }

        let raw = self.fetch_raw(address).await?;
        let mut result = map_voter_info(raw);

        for loc in &mut result.polling_locations {
            if let Some(addr) = &loc.address {
                let addr = addr.clone();
                let coords = self.geocoder.geocode(&addr).await;
                loc.lat = coords.map(|(lat, _)| lat);
                loc.lng = coords.map(|(_, lng)| lng);
            }
        }

        self.cache.insert(address.to_string(), result.clone()).await;
        Ok(result)
    }

    pub async fn get_elections(&self, address: &str) -> Result<ElectionsResponse, AppError> {
        if let Some(cached) = self.elections_cache.get(address).await {
            return Ok(cached);
        }

        let raw = self.fetch_raw(address).await?;
        let result = map_elections(raw);
        self.elections_cache
            .insert(address.to_string(), result.clone())
            .await;
        Ok(result)
    }

    pub async fn get_registration(&self, address: &str) -> Result<RegistrationResponse, AppError> {
        if let Some(cached) = self.registration_cache.get(address).await {
            return Ok(cached);
        }

        let raw = self.fetch_raw(address).await?;
        let result = map_registration(raw);
        self.registration_cache
            .insert(address.to_string(), result.clone())
            .await;
        Ok(result)
    }

    pub async fn get_all_elections(&self) -> Result<AllElectionsResponse, AppError> {
        const CACHE_KEY: &str = "all";
        if let Some(cached) = self.all_elections_cache.get(CACHE_KEY).await {
            return Ok(cached);
        }

        let response = self
            .client
            .get(format!("{}/elections", self.base_url))
            .query(&[("key", &self.api_key)])
            .send()
            .await?;

        if !response.status().is_success() {
            let body: serde_json::Value = response.json().await.unwrap_or_default();
            let message = body
                .pointer("/error/message")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown error")
                .to_string();
            return Err(AppError::ExternalApiError {
                status: body
                    .pointer("/error/code")
                    .and_then(|v| v.as_u64())
                    .unwrap_or(502) as u16,
                message,
            });
        }

        let raw: ApiElectionsQueryResponse = response.json().await?;
        let result = AllElectionsResponse {
            elections: raw
                .elections
                .into_iter()
                .filter(|e| e.name != "VIP Test Election")
                .map(|e| ElectionItem {
                    id: e.id,
                    name: e.name,
                    election_day: e.election_day,
                    ocd_division_id: e.ocd_division_id,
                })
                .collect(),
        };

        self.all_elections_cache
            .insert(CACHE_KEY.to_string(), result.clone())
            .await;
        Ok(result)
    }

    async fn fetch_raw(&self, address: &str) -> Result<ApiVoterInfoResponse, AppError> {
        let response = self
            .client
            .get(format!("{}/voterinfo", self.base_url))
            .query(&[("address", address), ("key", &self.api_key)])
            .send()
            .await?;

        let status = response.status();

        if status == reqwest::StatusCode::NOT_FOUND {
            return Err(AppError::NotFound);
        }

        if !status.is_success() {
            let body: serde_json::Value = response.json().await.unwrap_or_default();
            let reason = body
                .pointer("/error/errors/0/reason")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let google_message = body
                .pointer("/error/message")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            return Err(match reason {
                "parseError" => AppError::ValidationError(
                    "Could not parse your address. Please check your input and try again."
                        .to_string(),
                ),
                "invalid" if google_message.contains("Election unknown") => {
                    AppError::NotFound
                }
                _ => AppError::ExternalApiError {
                    status: status.as_u16(),
                    message: google_message.to_string(),
                },
            });
        }

        Ok(response.json().await?)
    }
}

fn map_voter_info(raw: ApiVoterInfoResponse) -> VoterInfoResponse {
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
                        let parts: Vec<String> =
                            [addr.line1, addr.city, addr.state, addr.zip]
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
                    lat: None,
                    lng: None,
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

fn map_address(addr: ApiSimpleAddress) -> RegistrationAddress {
    RegistrationAddress {
        location_name: addr.location_name,
        line1: addr.line1,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
    }
}

fn map_registration(raw: ApiVoterInfoResponse) -> RegistrationResponse {
    let admin_body = raw
        .state
        .into_iter()
        .next()
        .and_then(|s| s.election_administration_body);

    match admin_body {
        None => RegistrationResponse {
            available: false,
            admin_name: None,
            registration_url: None,
            registration_confirmation_url: None,
            registration_deadline: None,
            election_info_url: None,
            absentee_voting_info_url: None,
            voting_location_finder_url: None,
            ballot_info_url: None,
            election_rules_url: None,
            voter_services: vec![],
            hours_of_operation: None,
            correspondence_address: None,
            physical_address: None,
            election_officials: vec![],
        },
        Some(body) => RegistrationResponse {
            available: true,
            admin_name: body.name,
            registration_url: body.election_registration_url,
            registration_confirmation_url: body.election_registration_confirmation_url,
            registration_deadline: body.registration_deadline,
            election_info_url: body.election_info_url,
            absentee_voting_info_url: body.absentee_voting_info_url,
            voting_location_finder_url: body.voting_location_finder_url,
            ballot_info_url: body.ballot_info_url,
            election_rules_url: body.election_rules_url,
            voter_services: body
                .voter_services
                .map(|s| {
                    s.split('|')
                        .map(|p| p.trim().to_string())
                        .filter(|p| !p.is_empty())
                        .collect()
                })
                .unwrap_or_default(),
            hours_of_operation: body.hours_of_operation,
            correspondence_address: body.correspondence_address.map(map_address),
            physical_address: body.physical_address.map(map_address),
            election_officials: body
                .election_officials
                .into_iter()
                .map(|o| ElectionOfficial {
                    name: o.name,
                    title: o.title,
                    email: o.email_address,
                    phone: o.office_phone_number,
                    fax: o.fax_number,
                })
                .collect(),
        },
    }
}

fn map_elections(raw: ApiVoterInfoResponse) -> ElectionsResponse {
    ElectionsResponse {
        election: Election {
            id: raw.election.id,
            name: raw.election.name,
            election_day: raw.election.election_day,
        },
        contests: raw
            .contests
            .into_iter()
            .enumerate()
            .map(|(i, c)| ContestDetail {
                id: i,
                office: c.office,
                district: c.district.and_then(|d| d.name),
                candidates: c
                    .candidates
                    .into_iter()
                    .map(|cand| CandidateDetail {
                        name: cand.name,
                        party: cand.party,
                        candidate_url: cand.candidate_url,
                        photo_url: cand.photo_url,
                        phone: cand.phone,
                        email: cand.email,
                        channels: cand
                            .channels
                            .into_iter()
                            .map(|ch| Channel {
                                channel_type: ch.channel_type,
                                id: ch.id,
                            })
                            .collect(),
                    })
                    .collect(),
            })
            .collect(),
    }
}

use std::env;
use std::time::Duration;

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;

use crate::errors::AppError;
use crate::models::{
    AllElectionsResponse, BallotCandidate, BallotContest, BallotLevel, BallotResponse, Candidate,
    CandidateDetail, Channel, Contest, ContestDetail, Election, ElectionItem, ElectionOfficial,
    ElectionsResponse, PollingLocation, RegistrationAddress, RegistrationResponse,
    VoterInfoResponse,
};
use crate::services::fec_api::{FecApiClient, FinanceJob};
use crate::services::geocoder::GeocoderClient;
use crate::services::state_registration::StateRegistrationService;

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
    scope: Option<String>,
}

#[derive(Deserialize)]
struct ApiContest {
    office: Option<String>,
    district: Option<ApiDistrict>,
    #[serde(default)]
    level: Vec<String>,
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

/// Core date fields pulled from a single Civic API `voterinfo` lookup, used by
/// the `/api/elections/dates` aggregator. All fields are `None` when the Civic
/// API has no election data for the address (`AppError::NotFound`).
#[derive(Debug, Clone, Default)]
pub struct CoreCivicDates {
    pub election_name: Option<String>,
    pub election_day: Option<String>,
    pub registration_deadline: Option<String>,
}

pub struct CivicApiClient {
    client: Client,
    api_key: String,
    base_url: String,
    cache: Cache<String, VoterInfoResponse>,
    elections_cache: Cache<String, ElectionsResponse>,
    all_elections_cache: Cache<String, AllElectionsResponse>,
    registration_cache: Cache<String, RegistrationResponse>,
    ballot_cache: Cache<String, BallotResponse>,
    geocoder: GeocoderClient,
    state_registration: StateRegistrationService,
    fec: FecApiClient,
}

impl CivicApiClient {
    pub fn new() -> Result<Self, AppError> {
        let api_key = env::var("GOOGLE_CIVIC_API_KEY")
            .map_err(|_| AppError::Config("GOOGLE_CIVIC_API_KEY".to_string()))?;
        Ok(Self::build(
            api_key,
            CIVIC_API_BASE.to_string(),
            GeocoderClient::new(),
            FecApiClient::new(),
        ))
    }

    /// Constructs a client pointing at a custom base URL. Used in tests to redirect
    /// requests to a mock server instead of the real Google Civic API. The FEC client defaults
    /// to the same mock server (which will 404 any FEC-shaped request it doesn't recognize) so
    /// tests that don't care about campaign-finance data never make a real network call.
    pub fn new_with_base_url(api_key: &str, base_url: &str) -> Self {
        Self::build(
            api_key.to_string(),
            base_url.to_string(),
            GeocoderClient::new(),
            FecApiClient::new_with_base_url("test_key", base_url),
        )
    }

    /// Constructs a client with custom base URLs for both the Civic API and Nominatim.
    /// Used in tests that also need to mock geocoding. The FEC client defaults to the civic
    /// mock server, same rationale as `new_with_base_url`.
    pub fn new_with_urls(api_key: &str, civic_base_url: &str, geocoder_base_url: &str) -> Self {
        Self::build(
            api_key.to_string(),
            civic_base_url.to_string(),
            GeocoderClient::new_with_base_url(geocoder_base_url),
            FecApiClient::new_with_base_url("test_key", civic_base_url),
        )
    }

    /// Constructs a client with custom base URLs for both the Civic API and the FEC API. Used in
    /// tests that need to mock campaign-finance scenarios (`/api/elections`, `/api/ballot`).
    pub fn new_with_civic_and_fec_urls(api_key: &str, civic_base_url: &str, fec_base_url: &str) -> Self {
        Self::build(
            api_key.to_string(),
            civic_base_url.to_string(),
            GeocoderClient::new(),
            FecApiClient::new_with_base_url("test_key", fec_base_url),
        )
    }

    fn build(api_key: String, base_url: String, geocoder: GeocoderClient, fec: FecApiClient) -> Self {
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

        let ballot_cache = Cache::builder()
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
            ballot_cache,
            geocoder,
            state_registration: StateRegistrationService::load(),
            fec,
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
        // Computed from the raw contest fields (office/district.scope/level[]) before `raw` is
        // consumed by `map_elections` below — `ContestDetail` itself doesn't retain those fields,
        // only `office`, so this is the one point where federal/state/local can still be derived.
        let federal_flags: Vec<bool> = raw
            .contests
            .iter()
            .map(|c| {
                let scope = c.district.as_ref().and_then(|d| d.scope.as_deref());
                classify_level(c.office.as_deref(), scope, &c.level) == BallotLevel::Federal
            })
            .collect();
        let election_day = raw.election.election_day.clone();
        let mut result = map_elections(raw);

        let state = extract_state_from_address(address);
        let cycle = fec_cycle_for(&election_day);
        self.attach_finance_to_election_contests(&mut result.contests, &federal_flags, state.as_deref(), cycle)
            .await;

        self.elections_cache
            .insert(address.to_string(), result.clone())
            .await;
        Ok(result)
    }

    pub async fn get_ballot(&self, address: &str) -> Result<BallotResponse, AppError> {
        if let Some(cached) = self.ballot_cache.get(address).await {
            return Ok(cached);
        }

        let raw = self.fetch_raw(address).await?;
        let election_day = raw.election.election_day.clone();
        let mut result = map_ballot(raw);

        let state = extract_state_from_address(address);
        let cycle = fec_cycle_for(&election_day);
        self.attach_finance_to_ballot_contests(&mut result.contests, state.as_deref(), cycle)
            .await;

        self.ballot_cache
            .insert(address.to_string(), result.clone())
            .await;
        Ok(result)
    }

    /// Enriches `/api/elections` candidates with campaign-finance data. Only attempts a lookup
    /// for candidates in a Federal-classified contest (`federal_flags`, one entry per contest in
    /// the same order) whose office title maps to a known FEC office code — this gates the FEC
    /// call site itself, so no lookup is ever attempted for a state/local candidate (FR-002,
    /// User Story 3), not merely discarded afterward.
    async fn attach_finance_to_election_contests(
        &self,
        contests: &mut [ContestDetail],
        federal_flags: &[bool],
        state: Option<&str>,
        cycle: u16,
    ) {
        let mut targets: Vec<(usize, usize)> = Vec::new();
        let mut jobs: Vec<FinanceJob> = Vec::new();

        for (ci, contest) in contests.iter().enumerate() {
            if !federal_flags[ci] {
                continue;
            }
            let Some(office_code) = fec_office_code(contest.office.as_deref()) else {
                continue;
            };
            for (di, candidate) in contest.candidates.iter().enumerate() {
                jobs.push(FinanceJob {
                    index: targets.len(),
                    name: candidate.name.clone(),
                    office_code,
                    state: candidate_state_for_office(office_code, state),
                });
                targets.push((ci, di));
            }
        }

        if targets.is_empty() {
            return;
        }

        for (job_index, finance) in self.fec.resolve_batch(cycle, jobs).await {
            let (ci, di) = targets[job_index];
            contests[ci].candidates[di].campaign_finance = finance;
        }
    }

    /// Enriches `/api/ballot` candidates with campaign-finance data. Unlike the elections path,
    /// `BallotContest` already carries a `level` field (set by `map_ballot`/`classify_level`), so
    /// the Federal gate is checked directly rather than via a separately-computed flags list —
    /// same gating guarantee as `attach_finance_to_election_contests` (FR-002, User Story 3).
    async fn attach_finance_to_ballot_contests(
        &self,
        contests: &mut [BallotContest],
        state: Option<&str>,
        cycle: u16,
    ) {
        let mut targets: Vec<(usize, usize)> = Vec::new();
        let mut jobs: Vec<FinanceJob> = Vec::new();

        for (ci, contest) in contests.iter().enumerate() {
            if contest.level != BallotLevel::Federal {
                continue;
            }
            let Some(office_code) = fec_office_code(contest.office.as_deref()) else {
                continue;
            };
            for (di, candidate) in contest.candidates.iter().enumerate() {
                jobs.push(FinanceJob {
                    index: targets.len(),
                    name: candidate.name.clone(),
                    office_code,
                    state: candidate_state_for_office(office_code, state),
                });
                targets.push((ci, di));
            }
        }

        if targets.is_empty() {
            return;
        }

        for (job_index, finance) in self.fec.resolve_batch(cycle, jobs).await {
            let (ci, di) = targets[job_index];
            contests[ci].candidates[di].campaign_finance = finance;
        }
    }

    pub async fn get_registration(&self, address: &str) -> Result<RegistrationResponse, AppError> {
        if let Some(cached) = self.registration_cache.get(address).await {
            return Ok(cached);
        }

        let result = match self.fetch_raw(address).await {
            Ok(raw) => map_registration(raw, &self.state_registration, address),
            // No election data for this address — use static fallback so the
            // caller can still show state-level registration info.
            Err(AppError::NotFound) => {
                state_fallback_registration(&self.state_registration, address)
            }
            // Bad address format — propagate the error so the caller can fix input.
            Err(e) => return Err(e),
        };

        self.registration_cache
            .insert(address.to_string(), result.clone())
            .await;
        Ok(result)
    }

    /// Fetches election day and registration deadline for an address, for use by
    /// the `/api/elections/dates` aggregator. Unlike `get_registration`, a missing
    /// election (`AppError::NotFound`) is treated as "no core dates available"
    /// rather than propagated, since the caller may still have scraped state data
    /// to fall back on.
    pub async fn get_core_dates(&self, address: &str) -> Result<CoreCivicDates, AppError> {
        match self.fetch_raw(address).await {
            Ok(raw) => {
                let registration_deadline = raw
                    .state
                    .into_iter()
                    .next()
                    .and_then(|s| s.election_administration_body)
                    .and_then(|b| b.registration_deadline);
                Ok(CoreCivicDates {
                    election_name: Some(raw.election.name),
                    election_day: Some(raw.election.election_day),
                    registration_deadline,
                })
            }
            Err(AppError::NotFound) => Ok(CoreCivicDates::default()),
            Err(e) => Err(e),
        }
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

/// Extracts the two-letter state abbreviation from an address string of the form
/// `"<street>, <city>, <STATE> <zip>"`.
pub(crate) fn extract_state_from_address(address: &str) -> Option<String> {
    let tokens: Vec<&str> = address.split_whitespace().collect();
    if tokens.len() >= 2 {
        let candidate = tokens[tokens.len() - 2];
        if candidate.len() == 2 && candidate.chars().all(|c| c.is_ascii_alphabetic()) {
            return Some(candidate.to_uppercase());
        }
    }
    None
}

/// Maps an office title to the FEC office code (`P`resident/`S`enate/`H`ouse). Returns `None`
/// for anything that isn't clearly one of the three federal offices FEC tracks — this doubles as
/// a second, stricter gate before ever attempting an FEC lookup (in addition to the
/// Federal/State/Local classification already applied by the caller).
fn fec_office_code(office: Option<&str>) -> Option<char> {
    let title = office?.to_lowercase();
    if title.contains("president") {
        Some('P')
    } else if title.contains("senat") {
        Some('S')
    } else if title.contains("representative") || title.contains("congress") || title.contains("house") {
        Some('H')
    } else {
        None
    }
}

/// The FEC two-year cycle for a given election day: FEC cycles are named by their even year
/// (e.g. cycle "2026" covers calendar years 2025-2026), so an odd-year election day rolls up to
/// the following even year.
fn fec_cycle_for(election_day: &str) -> u16 {
    let year: u16 = election_day
        .get(0..4)
        .and_then(|y| y.parse().ok())
        .unwrap_or(0);
    if year % 2 == 1 {
        year + 1
    } else {
        year
    }
}

/// Presidential candidates are a national race — an address-derived state filter would
/// incorrectly exclude them from FEC's candidate search. Senate/House candidates are tied to a
/// specific state, so the address's state is used to narrow the search.
fn candidate_state_for_office(office_code: char, state: Option<&str>) -> Option<String> {
    if office_code == 'P' {
        None
    } else {
        state.map(|s| s.to_string())
    }
}

/// Builds a `RegistrationResponse` from static fallback data when the Civic API
/// has no election data for the given address.
fn state_fallback_registration(
    svc: &StateRegistrationService,
    address: &str,
) -> RegistrationResponse {
    let state_info = extract_state_from_address(address).and_then(|s| svc.lookup(&s));

    match state_info {
        Some(info) => RegistrationResponse {
            available: false,
            same_day_registration: Some(info.same_day_registration),
            online_registration: Some(info.online_registration),
            admin_name: None,
            registration_url: Some(info.registration_url.clone()),
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
        None => RegistrationResponse {
            available: false,
            same_day_registration: None,
            online_registration: None,
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
    }
}

fn map_registration(
    raw: ApiVoterInfoResponse,
    svc: &StateRegistrationService,
    address: &str,
) -> RegistrationResponse {
    let state_info = extract_state_from_address(address).and_then(|s| svc.lookup(&s));
    let admin_body = raw
        .state
        .into_iter()
        .next()
        .and_then(|s| s.election_administration_body);

    match admin_body {
        None => RegistrationResponse {
            available: false,
            same_day_registration: state_info.map(|i| i.same_day_registration),
            online_registration: state_info.map(|i| i.online_registration),
            admin_name: None,
            registration_url: state_info.map(|i| i.registration_url.clone()),
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
            same_day_registration: state_info.map(|i| i.same_day_registration),
            online_registration: state_info.map(|i| i.online_registration),
            admin_name: body.name,
            registration_url: body
                .election_registration_url
                .or_else(|| state_info.map(|i| i.registration_url.clone())),
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

const FEDERAL_OFFICE_KEYWORDS: [&str; 4] = ["united states", "u.s.", "president", "congress"];

const STATE_OFFICE_KEYWORDS: [&str; 11] = [
    "governor",
    "state senate",
    "state senator",
    "state house",
    "state representative",
    "state legislature",
    "secretary of state",
    "attorney general",
    "state treasurer",
    "state auditor",
    "supreme court",
];

/// Classifies a contest into Federal/State/Local.
///
/// Google's Civic API `level[]` field is documented as the authoritative signal, but in
/// practice it is always empty/absent (effectively deprecated — see research.md). `office`
/// title keywords are the primary real-world signal instead, with `district.scope` as a
/// fallback for contests with no distinguishing office title (e.g. county/city contests,
/// which often have `office: null`). `scope` alone cannot disambiguate Federal from State
/// for a "statewide" contest (both a Governor race and a U.S. Senate race report
/// `scope: "statewide"`), so it is only consulted after the office-title check.
fn classify_level(office: Option<&str>, scope: Option<&str>, levels: &[String]) -> BallotLevel {
    // Honor the documented `level[]` field first, on the chance Google ever populates it.
    if levels.iter().any(|l| l == "country" || l == "international") {
        return BallotLevel::Federal;
    }
    if levels.iter().any(|l| l == "administrativeArea1") {
        return BallotLevel::State;
    }
    let has_granular_level = levels.iter().any(|l| {
        matches!(
            l.as_str(),
            "administrativeArea2" | "regional" | "locality" | "subLocality1" | "subLocality2" | "special"
        )
    });
    if has_granular_level {
        return BallotLevel::Local;
    }

    // Real-world fallback: classify from the office title Google actually populates.
    if let Some(office_lower) = office.map(str::to_lowercase) {
        if FEDERAL_OFFICE_KEYWORDS.iter().any(|kw| office_lower.contains(kw)) {
            return BallotLevel::Federal;
        }
        if STATE_OFFICE_KEYWORDS.iter().any(|kw| office_lower.contains(kw)) {
            return BallotLevel::State;
        }
    }

    // Last resort: district.scope, for contests with no distinguishing office title.
    match scope {
        Some("national") | Some("congressional") => BallotLevel::Federal,
        Some("stateUpper") | Some("stateLower") => BallotLevel::State,
        _ => BallotLevel::Local,
    }
}

fn map_ballot(raw: ApiVoterInfoResponse) -> BallotResponse {
    let mut contests: Vec<BallotContest> = raw
        .contests
        .into_iter()
        .map(|c| {
            let scope = c.district.as_ref().and_then(|d| d.scope.as_deref());
            let level = classify_level(c.office.as_deref(), scope, &c.level);
            BallotContest {
                id: 0,
                office: c.office,
                district: c.district.and_then(|d| d.name),
                level,
                candidates: c
                    .candidates
                    .into_iter()
                    .map(|cand| BallotCandidate {
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
                        campaign_finance: None,
                    })
                    .collect(),
            }
        })
        .collect();

    contests.sort_by_key(|c| c.level);

    let contests: Vec<BallotContest> = contests
        .into_iter()
        .enumerate()
        .map(|(i, mut c)| {
            c.id = i;
            c
        })
        .collect();

    BallotResponse {
        election: Election {
            id: raw.election.id,
            name: raw.election.name,
            election_day: raw.election.election_day,
        },
        contests,
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
                        campaign_finance: None,
                    })
                    .collect(),
            })
            .collect(),
    }
}

#[cfg(test)]
mod ballot_tests {
    use super::*;

    fn levels(values: &[&str]) -> Vec<String> {
        values.iter().map(|s| s.to_string()).collect()
    }

    // --- Explicit `level[]` signal (documented, but effectively never populated by Google
    // in practice — see research.md). Honored first when present. ---

    #[test]
    fn classify_level_maps_country_to_federal() {
        assert_eq!(
            classify_level(None, None, &levels(&["country"])),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_maps_international_to_federal() {
        assert_eq!(
            classify_level(None, None, &levels(&["international"])),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_maps_administrative_area_1_to_state() {
        assert_eq!(
            classify_level(None, None, &levels(&["administrativeArea1"])),
            BallotLevel::State
        );
    }

    #[test]
    fn classify_level_maps_granular_values_to_local() {
        for value in [
            "administrativeArea2",
            "regional",
            "locality",
            "subLocality1",
            "subLocality2",
            "special",
        ] {
            assert_eq!(
                classify_level(None, None, &levels(&[value])),
                BallotLevel::Local,
                "expected {value} to map to Local"
            );
        }
    }

    #[test]
    fn classify_level_mixed_array_prefers_federal_over_state() {
        assert_eq!(
            classify_level(None, None, &levels(&["administrativeArea1", "country"])),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_mixed_array_prefers_state_over_local() {
        assert_eq!(
            classify_level(None, None, &levels(&["locality", "administrativeArea1"])),
            BallotLevel::State
        );
    }

    // --- Real-world fallback: office title + district.scope, since `level[]` is empty in
    // every live response we've observed. These reproduce actual Google Civic API output
    // for a 2026 Michigan primary address. ---

    #[test]
    fn classify_level_governor_with_statewide_scope_is_state() {
        assert_eq!(
            classify_level(Some("Governor"), Some("statewide"), &[]),
            BallotLevel::State
        );
    }

    #[test]
    fn classify_level_us_senator_with_statewide_scope_is_federal() {
        // Regression case: `scope: "statewide"` alone cannot distinguish this from Governor
        // above — the office title is what makes this Federal.
        assert_eq!(
            classify_level(Some("United States Senator"), Some("statewide"), &[]),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_representative_in_congress_with_no_scope_is_federal() {
        assert_eq!(
            classify_level(Some("Representative in Congress"), None, &[]),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_president_is_federal() {
        assert_eq!(
            classify_level(Some("President of the United States"), None, &[]),
            BallotLevel::Federal
        );
    }

    #[test]
    fn classify_level_state_senator_with_state_upper_scope_is_state() {
        assert_eq!(
            classify_level(Some("State Senator"), Some("stateUpper"), &[]),
            BallotLevel::State
        );
    }

    #[test]
    fn classify_level_state_legislature_rep_with_state_lower_scope_is_state() {
        assert_eq!(
            classify_level(
                Some("Representative in State Legislature"),
                Some("stateLower"),
                &[]
            ),
            BallotLevel::State
        );
    }

    #[test]
    fn classify_level_scope_falls_back_to_state_when_office_has_no_keyword() {
        // Proves the scope fallback works on its own, independent of an office-title match.
        assert_eq!(
            classify_level(Some("Something Generic"), Some("stateUpper"), &[]),
            BallotLevel::State
        );
    }

    #[test]
    fn classify_level_county_contest_with_no_office_is_local() {
        // County/city contests frequently have `office: null` in real responses.
        assert_eq!(
            classify_level(None, Some("countywide"), &[]),
            BallotLevel::Local
        );
    }

    #[test]
    fn classify_level_city_contest_with_no_office_is_local() {
        assert_eq!(
            classify_level(None, Some("citywide"), &[]),
            BallotLevel::Local
        );
    }

    #[test]
    fn classify_level_no_signals_at_all_defaults_to_local() {
        assert_eq!(classify_level(None, None, &[]), BallotLevel::Local);
    }

    fn api_contest(office: &str, scope: Option<&str>) -> ApiContest {
        ApiContest {
            office: Some(office.to_string()),
            district: scope.map(|s| ApiDistrict {
                name: Some("Test District".to_string()),
                scope: Some(s.to_string()),
            }),
            level: vec![],
            candidates: vec![],
        }
    }

    #[test]
    fn map_ballot_assigns_sequential_contest_ids_in_final_sorted_order() {
        // Deliberately unsorted input order: Local, Federal, State.
        let raw = ApiVoterInfoResponse {
            election: ApiElection {
                id: "1".to_string(),
                name: "Test Election".to_string(),
                election_day: "2026-11-03".to_string(),
            },
            polling_locations: vec![],
            contests: vec![
                api_contest("City Council", None),
                api_contest("President of the United States", None),
                api_contest("Governor", Some("statewide")),
            ],
            state: vec![],
        };

        let result = map_ballot(raw);

        assert_eq!(result.contests.len(), 3);
        assert_eq!(result.contests[0].level, BallotLevel::Federal);
        assert_eq!(result.contests[0].id, 0);
        assert_eq!(result.contests[1].level, BallotLevel::State);
        assert_eq!(result.contests[1].id, 1);
        assert_eq!(result.contests[2].level, BallotLevel::Local);
        assert_eq!(result.contests[2].id, 2);
    }
}

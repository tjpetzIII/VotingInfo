use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Election {
    pub id: String,
    pub name: String,
    pub election_day: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PollingLocation {
    pub name: Option<String>,
    pub address: Option<String>,
    pub hours: Option<String>,
    pub location_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Candidate {
    pub name: String,
    pub party: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Contest {
    pub office: Option<String>,
    pub district: Option<String>,
    pub candidates: Vec<Candidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoterInfoResponse {
    pub election: Election,
    pub polling_locations: Vec<PollingLocation>,
    pub contests: Vec<Contest>,
}

// --- All elections query types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionItem {
    pub id: String,
    pub name: String,
    pub election_day: String,
    pub ocd_division_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AllElectionsResponse {
    pub elections: Vec<ElectionItem>,
}

// --- Elections endpoint types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub channel_type: String,
    pub id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateDetail {
    pub name: String,
    pub party: Option<String>,
    pub candidate_url: Option<String>,
    pub photo_url: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub channels: Vec<Channel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContestDetail {
    pub id: usize,
    pub office: Option<String>,
    pub district: Option<String>,
    pub candidates: Vec<CandidateDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionsResponse {
    pub election: Election,
    pub contests: Vec<ContestDetail>,
}

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

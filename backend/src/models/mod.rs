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
    pub lat: Option<f64>,
    pub lng: Option<f64>,
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

// --- Registration endpoint types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ElectionOfficial {
    pub name: Option<String>,
    pub title: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub fax: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrationAddress {
    pub location_name: Option<String>,
    pub line1: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrationResponse {
    pub available: bool,
    /// Whether same-day / Election Day registration is allowed in this state.
    /// Populated from static fallback data when Civic API data is unavailable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub same_day_registration: Option<bool>,
    /// Whether online voter registration is available in this state.
    /// Populated from static fallback data when Civic API data is unavailable.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub online_registration: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub admin_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registration_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registration_confirmation_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub registration_deadline: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub election_info_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub absentee_voting_info_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub voting_location_finder_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ballot_info_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub election_rules_url: Option<String>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub voter_services: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hours_of_operation: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub correspondence_address: Option<RegistrationAddress>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub physical_address: Option<RegistrationAddress>,
    #[serde(skip_serializing_if = "Vec::is_empty", default)]
    pub election_officials: Vec<ElectionOfficial>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn election_roundtrips_through_json() {
        let election = Election {
            id: "9001".into(),
            name: "General Election".into(),
            election_day: "2025-11-04".into(),
        };
        let json = serde_json::to_value(&election).unwrap();
        assert_eq!(json["id"], "9001");
        assert_eq!(json["name"], "General Election");
        assert_eq!(json["election_day"], "2025-11-04");

        let back: Election = serde_json::from_value(json).unwrap();
        assert_eq!(back.id, election.id);
    }

    #[test]
    fn all_elections_response_deserializes() {
        let json = r#"{
            "elections": [
                {"id": "1", "name": "Primary", "election_day": "2025-03-01"},
                {"id": "2", "name": "General", "election_day": "2025-11-04", "ocd_division_id": "ocd-division/country:us"}
            ]
        }"#;
        let resp: AllElectionsResponse = serde_json::from_str(json).unwrap();
        assert_eq!(resp.elections.len(), 2);
        assert_eq!(resp.elections[0].name, "Primary");
        assert!(resp.elections[0].ocd_division_id.is_none());
        assert!(resp.elections[1].ocd_division_id.is_some());
    }

    #[test]
    fn voter_info_response_with_empty_collections() {
        let resp = VoterInfoResponse {
            election: Election { id: "1".into(), name: "Test".into(), election_day: "2025-01-01".into() },
            polling_locations: vec![],
            contests: vec![],
        };
        let json = serde_json::to_value(&resp).unwrap();
        assert_eq!(json["polling_locations"].as_array().unwrap().len(), 0);
        assert_eq!(json["contests"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn polling_location_all_fields_optional() {
        let loc = PollingLocation {
            name: None,
            address: None,
            hours: None,
            location_name: None,
            lat: None,
            lng: None,
        };
        let json = serde_json::to_value(&loc).unwrap();
        assert!(json["name"].is_null());
        assert!(json["address"].is_null());
    }
}

use std::collections::HashMap;

use serde::Deserialize;

/// Registration data for a single U.S. state or D.C., loaded from the static
/// fallback JSON file at compile time.
#[derive(Debug, Clone, Deserialize)]
pub struct StateRegistrationInfo {
    pub registration_url: String,
    pub same_day_registration: bool,
    pub online_registration: bool,
}

/// In-memory lookup table of state abbreviation → registration info.
/// Populated once at startup from the bundled JSON file.
pub struct StateRegistrationService {
    data: HashMap<String, StateRegistrationInfo>,
}

impl StateRegistrationService {
    /// Loads the bundled `data/state_registration_urls.json` file.
    /// Panics at startup if the JSON is malformed (compile-time asset).
    pub fn load() -> Self {
        // Include the JSON at compile time so no runtime file I/O is needed.
        let raw = include_str!("../../data/state_registration_urls.json");

        // serde_json silently skips unknown fields (e.g. "_comment"), so the
        // top-level object is parsed as a plain HashMap.
        let data: HashMap<String, StateRegistrationInfo> =
            serde_json::from_str(raw).expect("state_registration_urls.json is malformed");

        Self { data }
    }

    /// Returns the registration info for a two-letter state abbreviation
    /// (case-insensitive), or `None` if not found.
    pub fn lookup(&self, state_abbr: &str) -> Option<&StateRegistrationInfo> {
        self.data.get(&state_abbr.to_uppercase())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_51_jurisdictions_present() {
        let svc = StateRegistrationService::load();
        let expected = [
            "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN",
            "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV",
            "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN",
            "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
        ];
        for abbr in &expected {
            assert!(
                svc.lookup(abbr).is_some(),
                "Missing state: {abbr}"
            );
        }
    }

    #[test]
    fn lookup_is_case_insensitive() {
        let svc = StateRegistrationService::load();
        assert!(svc.lookup("ca").is_some());
        assert!(svc.lookup("CA").is_some());
        assert!(svc.lookup("Ca").is_some());
    }

    #[test]
    fn registration_urls_are_non_empty() {
        let svc = StateRegistrationService::load();
        let info = svc.lookup("CA").unwrap();
        assert!(!info.registration_url.is_empty());
    }

    #[test]
    fn known_sdr_and_online_flags() {
        let svc = StateRegistrationService::load();
        // MN has same-day registration and online registration
        let mn = svc.lookup("MN").unwrap();
        assert!(mn.same_day_registration);
        assert!(mn.online_registration);

        // TX has neither same-day nor online registration
        let tx = svc.lookup("TX").unwrap();
        assert!(!tx.same_day_registration);
        assert!(!tx.online_registration);
    }
}

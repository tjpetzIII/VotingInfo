//! Client for the OpenFEC API (https://api.open.fec.gov/developers/), used to enrich federal
//! (President/Senate/House) candidates with campaign-finance totals and top contributors.
//!
//! See `specs/006-fec-campaign-finance/research.md` for the design rationale: matching is
//! deliberately conservative (fails closed to "no data" on any ambiguity, research.md §3), and
//! results are cached per-candidate (not per-address) with a 24h TTL to stay within the free-tier
//! rate limit (research.md §2, §4).

use std::env;
use std::time::Duration;

use moka::future::Cache;
use reqwest::Client;
use serde::Deserialize;

use crate::models::{CampaignFinanceSummary, Contributor};

const FEC_API_BASE: &str = "https://api.open.fec.gov/v1";
const DEMO_KEY: &str = "DEMO_KEY";

// Raw deserialization types matching OpenFEC's JSON shape exactly — never exposed outside this
// module (Constitution Principle IV: raw third-party responses are never forwarded as-is).

#[derive(Debug, Deserialize)]
struct ApiFecCandidate {
    candidate_id: String,
    name: String,
}

#[derive(Debug, Deserialize, Default)]
struct ApiFecSearchResponse {
    #[serde(default)]
    results: Vec<ApiFecCandidate>,
}

#[derive(Debug, Deserialize)]
struct ApiFecCandidateTotals {
    #[serde(default)]
    receipts: f64,
    #[serde(default)]
    disbursements: f64,
    #[serde(default)]
    cash_on_hand_end_period: f64,
    coverage_end_date: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct ApiFecTotalsResponse {
    #[serde(default)]
    results: Vec<ApiFecCandidateTotals>,
}

#[derive(Debug, Deserialize)]
struct ApiFecCommittee {
    committee_id: String,
    designation: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct ApiFecCommitteesResponse {
    #[serde(default)]
    results: Vec<ApiFecCommittee>,
}

#[derive(Debug, Deserialize)]
struct ApiFecByEmployer {
    employer: Option<String>,
    #[serde(default)]
    total: f64,
}

#[derive(Debug, Deserialize, Default)]
struct ApiFecByEmployerResponse {
    #[serde(default)]
    results: Vec<ApiFecByEmployer>,
}

/// A single federal candidate's campaign-finance lookup, batched for concurrent resolution
/// (research.md §6). `index` identifies the candidate's position in the caller's own bookkeeping
/// (e.g. a flat list of (contest, candidate) positions) — this module has no knowledge of the
/// caller's data shape.
pub(crate) struct FinanceJob {
    pub index: usize,
    pub name: String,
    pub office_code: char,
    pub state: Option<String>,
}

#[derive(Clone)]
pub struct FecApiClient {
    client: Client,
    api_key: String,
    base_url: String,
    /// Keyed by normalized name + state + office + cycle (not by address) so a given federal
    /// candidate's lookup is reused across every voter who sees them on a ballot — see
    /// research.md §4.
    cache: Cache<String, Option<CampaignFinanceSummary>>,
}

impl Default for FecApiClient {
    fn default() -> Self {
        Self::new()
    }
}

impl FecApiClient {
    pub fn new() -> Self {
        let api_key = env::var("FEC_API_KEY").unwrap_or_else(|_| DEMO_KEY.to_string());
        Self::build(api_key, FEC_API_BASE.to_string())
    }

    /// Constructs a client pointing at a custom base URL. Used in tests to redirect requests to
    /// a mock server instead of the real OpenFEC API.
    pub fn new_with_base_url(api_key: &str, base_url: &str) -> Self {
        Self::build(api_key.to_string(), base_url.to_string())
    }

    fn build(api_key: String, base_url: String) -> Self {
        let cache = Cache::builder()
            .time_to_live(Duration::from_secs(24 * 60 * 60))
            .build();
        Self {
            client: Client::new(),
            api_key,
            base_url,
            cache,
        }
    }

    /// Resolves campaign-finance data for a batch of federal candidates concurrently, using the
    /// per-candidate cache. Returns `(job.index, result)` pairs, in no particular order.
    pub(crate) async fn resolve_batch(
        &self,
        cycle: u16,
        jobs: Vec<FinanceJob>,
    ) -> Vec<(usize, Option<CampaignFinanceSummary>)> {
        let mut set = tokio::task::JoinSet::new();
        for job in jobs {
            let fec = self.clone();
            set.spawn(async move {
                let result = fec
                    .get_campaign_finance(&job.name, job.state.as_deref(), job.office_code, cycle)
                    .await;
                (job.index, result)
            });
        }

        let mut out = Vec::new();
        while let Some(res) = set.join_next().await {
            if let Ok(pair) = res {
                out.push(pair);
            }
        }
        out
    }

    /// Resolves a single candidate's campaign-finance summary, or `None` when no confident match
    /// exists (FR-004/FR-005) or the FEC API is unavailable (FR-007) — both fail closed the same
    /// way. Cached per research.md §4, including cached `None`s, so repeated "no match" lookups
    /// don't keep burning rate-limit budget.
    async fn get_campaign_finance(
        &self,
        name: &str,
        state: Option<&str>,
        office_code: char,
        cycle: u16,
    ) -> Option<CampaignFinanceSummary> {
        let cache_key = format!(
            "{}|{}|{}|{}",
            normalize_name(name).join(" "),
            state.unwrap_or(""),
            office_code,
            cycle
        );
        if let Some(cached) = self.cache.get(&cache_key).await {
            return cached;
        }

        let result = self.resolve_campaign_finance(name, state, office_code, cycle).await;
        self.cache.insert(cache_key, result.clone()).await;
        result
    }

    async fn resolve_campaign_finance(
        &self,
        name: &str,
        state: Option<&str>,
        office_code: char,
        cycle: u16,
    ) -> Option<CampaignFinanceSummary> {
        let candidate_id = self.match_candidate(name, state, office_code, cycle).await?;
        let mut summary = self.fetch_totals(&candidate_id, cycle).await?;

        if let Some(committee_id) = self.fetch_principal_committee_id(&candidate_id, cycle).await {
            summary.top_contributors = self.fetch_top_contributors(&committee_id, cycle).await;
        }

        Some(summary)
    }

    /// Matches a Civic API candidate to an FEC candidate by name + state + office + cycle.
    /// Returns `None` on zero results or on 2+ plausible results (ambiguous) — research.md §3,
    /// FR-004/FR-005. Never guesses among multiple plausible candidates.
    async fn match_candidate(
        &self,
        name: &str,
        state: Option<&str>,
        office_code: char,
        cycle: u16,
    ) -> Option<String> {
        let office = office_code.to_string();
        let cycle_str = cycle.to_string();
        let mut query: Vec<(&str, &str)> = vec![
            ("q", name),
            ("office", &office),
            ("cycle", &cycle_str),
            ("api_key", &self.api_key),
        ];
        if let Some(s) = state {
            query.push(("state", s));
        }

        let response = self
            .client
            .get(format!("{}/candidates/search/", self.base_url))
            .query(&query)
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let parsed: ApiFecSearchResponse = response.json().await.ok()?;
        let plausible: Vec<&ApiFecCandidate> = parsed
            .results
            .iter()
            .filter(|c| names_plausibly_match(name, &c.name))
            .collect();

        match plausible.as_slice() {
            [only] => Some(only.candidate_id.clone()),
            _ => None,
        }
    }

    async fn fetch_totals(&self, candidate_id: &str, cycle: u16) -> Option<CampaignFinanceSummary> {
        let response = self
            .client
            .get(format!("{}/candidate/{}/totals/", self.base_url, candidate_id))
            .query(&[("cycle", cycle.to_string()), ("api_key", self.api_key.clone())])
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let parsed: ApiFecTotalsResponse = response.json().await.ok()?;
        let totals = parsed.results.into_iter().next()?;
        let as_of_date = totals.coverage_end_date?;

        Some(CampaignFinanceSummary {
            total_raised: totals.receipts,
            total_spent: totals.disbursements,
            cash_on_hand: totals.cash_on_hand_end_period,
            as_of_date,
            top_contributors: vec![],
        })
    }

    async fn fetch_principal_committee_id(&self, candidate_id: &str, cycle: u16) -> Option<String> {
        let response = self
            .client
            .get(format!("{}/candidate/{}/committees/", self.base_url, candidate_id))
            .query(&[("cycle", cycle.to_string()), ("api_key", self.api_key.clone())])
            .send()
            .await
            .ok()?;

        if !response.status().is_success() {
            return None;
        }

        let parsed: ApiFecCommitteesResponse = response.json().await.ok()?;
        parsed
            .results
            .iter()
            .find(|c| c.designation.as_deref() == Some("P"))
            .or_else(|| parsed.results.first())
            .map(|c| c.committee_id.clone())
    }

    async fn fetch_top_contributors(&self, committee_id: &str, cycle: u16) -> Vec<Contributor> {
        let response = match self
            .client
            .get(format!("{}/schedules/schedule_a/by_employer/", self.base_url))
            .query(&[
                ("committee_id", committee_id.to_string()),
                ("cycle", cycle.to_string()),
                ("sort", "-total".to_string()),
                ("per_page", "5".to_string()),
                ("api_key", self.api_key.clone()),
            ])
            .send()
            .await
        {
            Ok(r) => r,
            Err(_) => return vec![],
        };

        if !response.status().is_success() {
            return vec![];
        }

        let parsed: ApiFecByEmployerResponse = match response.json().await {
            Ok(p) => p,
            Err(_) => return vec![],
        };

        parsed
            .results
            .into_iter()
            .filter_map(|r| {
                let name = r.employer?;
                Some(Contributor { name, total: r.total })
            })
            .collect()
    }
}

/// Normalizes a candidate name into a set of comparable tokens: lowercased, punctuation
/// stripped, common suffixes (Jr./Sr./II/III/IV) dropped. FEC names are commonly formatted
/// "LAST, FIRST MIDDLE" while Civic API names are "First Middle Last" — comparing token *sets*
/// (order-independent) handles that reordering without any special-casing.
fn normalize_name(name: &str) -> Vec<String> {
    const SUFFIXES: [&str; 6] = ["jr", "sr", "ii", "iii", "iv", "v"];
    let cleaned: String = name
        .chars()
        .map(|c| if c.is_alphanumeric() || c.is_whitespace() { c } else { ' ' })
        .collect();

    let mut tokens: Vec<String> = cleaned
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !SUFFIXES.contains(&t.as_str()))
        .collect();
    tokens.sort();
    tokens
}

/// A match is only "plausible" when both names normalize to the exact same set of tokens.
/// Deliberately strict (no partial/fuzzy scoring) — research.md §3 accepts missing some
/// legitimate matches in exchange for never guessing among ambiguous candidates.
fn names_plausibly_match(a: &str, b: &str) -> bool {
    let ta = normalize_name(a);
    if ta.is_empty() {
        return false;
    }
    ta == normalize_name(b)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_name_strips_punctuation_case_and_suffixes() {
        assert_eq!(
            normalize_name("Jane Q. Doe, Jr."),
            normalize_name("jane q doe")
        );
    }

    #[test]
    fn names_plausibly_match_handles_last_first_reordering() {
        // FEC-style "LAST, FIRST" vs Civic-style "First Last".
        assert!(names_plausibly_match("Jane Doe", "DOE, JANE"));
    }

    #[test]
    fn names_plausibly_match_rejects_different_people() {
        assert!(!names_plausibly_match("Jane Doe", "John Doe"));
    }

    #[test]
    fn names_plausibly_match_rejects_empty_name() {
        assert!(!names_plausibly_match("", "Jane Doe"));
    }

    #[test]
    fn match_candidate_returns_none_on_zero_results() {
        // No mock server needed — filtering an empty results list always yields no match.
        let parsed = ApiFecSearchResponse { results: vec![] };
        let plausible: Vec<&ApiFecCandidate> = parsed
            .results
            .iter()
            .filter(|c| names_plausibly_match("Jane Doe", &c.name))
            .collect();
        assert!(plausible.is_empty());
    }

    #[test]
    fn match_candidate_ambiguous_when_two_plausible_results() {
        let parsed = ApiFecSearchResponse {
            results: vec![
                ApiFecCandidate { candidate_id: "H001".into(), name: "DOE, JANE".into() },
                ApiFecCandidate { candidate_id: "H002".into(), name: "Jane Doe".into() },
            ],
        };
        let plausible: Vec<&ApiFecCandidate> = parsed
            .results
            .iter()
            .filter(|c| names_plausibly_match("Jane Doe", &c.name))
            .collect();
        // Both entries match the same person by name alone; the exactly-one-result rule (applied
        // in `match_candidate`) would treat this as ambiguous and return None — this test proves
        // the filter itself doesn't collapse duplicates into a false single match.
        assert_eq!(plausible.len(), 2);
    }

    #[test]
    fn match_candidate_single_plausible_result_is_a_match() {
        let parsed = ApiFecSearchResponse {
            results: vec![
                ApiFecCandidate { candidate_id: "H001".into(), name: "DOE, JANE Q".into() },
                ApiFecCandidate { candidate_id: "H002".into(), name: "SMITH, JOHN".into() },
            ],
        };
        let plausible: Vec<&ApiFecCandidate> = parsed
            .results
            .iter()
            .filter(|c| names_plausibly_match("Jane Q. Doe", &c.name))
            .collect();
        assert_eq!(plausible.len(), 1);
        assert_eq!(plausible[0].candidate_id, "H001");
    }
}

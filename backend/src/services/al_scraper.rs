use reqwest::{Certificate, Client};
use scraper::{ElementRef, Html, Selector};

use crate::{
    errors::AppError,
    models::{AlElection, AlImportantDate},
};

const AL_ELECTIONS_URL: &str =
    "https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections";

/// The Alabama SOS server serves only its leaf certificate and relies on AIA
/// fetching for the intermediate, which rustls does not perform. Bundle the
/// intermediate explicitly so the chain validates.
const AL_INTERMEDIATE_PEM: &[u8] = include_bytes!(
    "../../certs/globalsign_atlas_r3_ov_tls_ca_2026_q1.pem"
);

fn build_client() -> Result<Client, AppError> {
    let cert = Certificate::from_pem(AL_INTERMEDIATE_PEM)
        .map_err(|e| AppError::ScraperError(format!("load AL intermediate cert: {e}")))?;
    Client::builder()
        .add_root_certificate(cert)
        .build()
        .map_err(|e| AppError::ScraperError(format!("build AL client: {e}")))
}

pub struct ScrapedAlData {
    pub elections: Vec<AlElection>,
    pub important_dates: Vec<AlImportantDate>,
}

/// Fetch and parse the Alabama upcoming-elections page.
///
/// The `_client` parameter is ignored; we build a dedicated client that
/// trusts the bundled GlobalSign intermediate, since the AL server does not
/// send the full chain and rustls does not perform AIA chasing.
pub async fn scrape(_client: &Client) -> Result<ScrapedAlData, AppError> {
    let client = build_client()?;
    let html = client
        .get(AL_ELECTIONS_URL)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; VoteReadyBot/1.0; +https://voteready.app)",
        )
        .send()
        .await
        .map_err(|e| {
            let mut msg = format!("fetch failed: {e}");
            let mut src: Option<&dyn std::error::Error> = std::error::Error::source(&e);
            while let Some(s) = src {
                msg.push_str(&format!(" | caused by: {s}"));
                src = s.source();
            }
            AppError::ScraperError(msg)
        })?
        .text()
        .await
        .map_err(|e| AppError::ScraperError(format!("read body failed: {e}")))?;

    let document = Html::parse_document(&html);
    let (elections, important_dates) = parse_sections(&document);
    Ok(ScrapedAlData { elections, important_dates })
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

/// Walk the document in order, tracking the most recent `<h2>` heading.
/// When we hit a `<table>`, classify it based on the active heading:
///   - "State Elections"            -> `AlElection` rows
///   - "Local Elections/Referendums" -> `AlImportantDate` rows
fn parse_sections(document: &Html) -> (Vec<AlElection>, Vec<AlImportantDate>) {
    let sel = Selector::parse("h2, table").unwrap();

    let mut current_heading: Option<String> = None;
    let mut state_elections: Vec<AlElection> = Vec::new();
    let mut local_dates: Vec<AlImportantDate> = Vec::new();
    let election_year = chrono_year_fallback();

    for el in document.select(&sel) {
        match el.value().name() {
            "h2" => {
                current_heading = Some(collect_text(&el));
            }
            "table" => {
                let heading = current_heading.as_deref().unwrap_or("");
                if heading.contains("State Elections") {
                    for (date, name) in parse_two_column_rows(&el) {
                        let election_type = determine_type(&name);
                        state_elections.push(AlElection {
                            id: None,
                            election_name: name,
                            election_type,
                            election_date: date,
                            polls_hours: None,
                            registration_deadline: None,
                            mail_in_deadline: None,
                            state_code: "AL".to_string(),
                        });
                    }
                } else if heading.contains("Local Elections") {
                    for (date, name) in parse_two_column_rows(&el) {
                        local_dates.push(AlImportantDate {
                            id: None,
                            event_date: date,
                            event_description: name,
                            election_year,
                            state_code: "AL".to_string(),
                        });
                    }
                }
            }
            _ => {}
        }
    }

    (state_elections, local_dates)
}

/// Parse rows of a 2-column `Date | Election` table, skipping header rows.
fn parse_two_column_rows(table: &ElementRef) -> Vec<(String, String)> {
    let tr_sel = Selector::parse("tr").unwrap();
    let td_sel = Selector::parse("td").unwrap();

    let mut rows = Vec::new();
    for row in table.select(&tr_sel) {
        let cells: Vec<String> = row.select(&td_sel).map(|td| collect_text(&td)).collect();
        if cells.len() >= 2 && !cells[0].is_empty() && !cells[1].is_empty() {
            rows.push((cells[0].clone(), cells[1].clone()));
        }
    }
    rows
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Collect all text nodes within an element, joining them and trimming.
fn collect_text(el: &ElementRef) -> String {
    el.text().collect::<Vec<_>>().join("").trim().to_string()
}

fn determine_type(election_name: &str) -> String {
    let lower = election_name.to_lowercase();
    if lower.contains("primary") {
        "primary".to_string()
    } else if lower.contains("general") {
        "general".to_string()
    } else if lower.contains("special") {
        "special".to_string()
    } else {
        "other".to_string()
    }
}

/// Fallback year when the page doesn't explicitly state one — use the current year.
fn chrono_year_fallback() -> i32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    1970 + (secs / 31_557_600) as i32
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &str = r#"
        <html><body>
          <h2>State Elections</h2>
          <table>
            <thead><tr><th>Date</th><th>Election</th></tr></thead>
            <tbody>
              <tr><td>May 19, 2026</td><td>2026 Primary Election</td></tr>
              <tr><td>June 16, 2026</td><td>2026 Primary Runoff Election</td></tr>
              <tr><td>November 3, 2026</td><td>2026 General Election</td></tr>
            </tbody>
          </table>
          <h2>Local Elections/Referendums</h2>
          <table>
            <thead><tr><th>Date</th><th>Election</th></tr></thead>
            <tbody>
              <tr><td>August 25, 2026</td><td>City of Auburn, Bessemer</td></tr>
              <tr><td>August 24, 2027</td><td>City of Montgomery and Talladega</td></tr>
            </tbody>
          </table>
        </body></html>
    "#;

    #[test]
    fn parses_state_elections_table() {
        let document = Html::parse_document(FIXTURE);
        let (elections, _) = parse_sections(&document);
        assert_eq!(elections.len(), 3);
        assert_eq!(elections[0].election_date, "May 19, 2026");
        assert_eq!(elections[0].election_name, "2026 Primary Election");
        assert_eq!(elections[0].election_type, "primary");
        assert_eq!(elections[0].state_code, "AL");
        assert_eq!(elections[2].election_type, "general");
    }

    #[test]
    fn parses_local_elections_into_important_dates() {
        let document = Html::parse_document(FIXTURE);
        let (_, dates) = parse_sections(&document);
        assert_eq!(dates.len(), 2);
        assert_eq!(dates[0].event_date, "August 25, 2026");
        assert_eq!(dates[0].state_code, "AL");
        assert!(dates[0].election_year >= 2025);
    }

    #[test]
    fn runoff_classified_as_primary() {
        assert_eq!(determine_type("2026 Primary Runoff Election"), "primary");
    }
}

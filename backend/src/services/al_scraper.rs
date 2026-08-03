use reqwest::{Certificate, Client};
use scraper::{ElementRef, Html, Selector};

use crate::{
    errors::AppError,
    models::{ScrapedStateData, StateElection, StateImportantDate},
    services::scraper_utils::{chrono_year_fallback, collect_text, determine_type},
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
        .tls_certs_merge([cert])
        .build()
        .map_err(|e| AppError::ScraperError(format!("build AL client: {e}")))
}

/// Fetch and parse the Alabama upcoming-elections page.
///
/// The `_client` parameter is ignored; we build a dedicated client that
/// trusts the bundled GlobalSign intermediate, since the AL server does not
/// send the full chain and rustls does not perform AIA chasing.
pub async fn scrape(_client: &Client) -> Result<ScrapedStateData, AppError> {
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
    Ok(ScrapedStateData { elections, important_dates })
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

/// Walk the document in order, tracking the most recent `<h2>` heading.
/// When we hit a `<table>`, classify it based on the active heading:
///   - "State Elections"            -> `AlElection` rows
///   - "Local Elections/Referendums" -> `AlImportantDate` rows
fn parse_sections(document: &Html) -> (Vec<StateElection>, Vec<StateImportantDate>) {
    let sel = Selector::parse("h2, table").unwrap();

    let mut current_heading: Option<String> = None;
    let mut state_elections: Vec<StateElection> = Vec::new();
    let mut local_dates: Vec<StateImportantDate> = Vec::new();
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
                        state_elections.push(StateElection {
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
                        local_dates.push(StateImportantDate {
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

    #[test]
    fn special_general_classified_as_special() {
        // A name containing both "special" and "general" (e.g. FL's district
        // races held on the general election's date) must not collide with
        // the real general election under the (election_date, election_type)
        // unique key.
        assert_eq!(
            determine_type("Florida State Senate District 21 Special General Election"),
            "special"
        );
    }
}

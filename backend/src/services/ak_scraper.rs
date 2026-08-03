use reqwest::{Certificate, Client};
use scraper::{Html, Selector};

use crate::{
    errors::AppError,
    models::{ScrapedStateData, StateElection, StateImportantDate},
    services::scraper_utils::{chrono_year_fallback, collect_text, determine_type},
};

const AK_ELECTION_INFO_URL: &str =
    "https://www.elections.alaska.gov/election-information/";

const AK_CALENDAR_URL: &str =
    "https://www.elections.alaska.gov/calendar/";

/// The elections.alaska.gov server sends its leaf cert + GlobalSign RSA OV SSL
/// CA 2018 intermediate, but the intermediate is not trusted by rustls's default
/// root store.  Bundle it explicitly so the chain validates.
/// Intermediate expires: Nov 21 2028 — renew before that date.
const AK_INTERMEDIATE_PEM: &[u8] = include_bytes!(
    "../../certs/globalsign_rsa_ov_ssl_ca_2018.pem"
);

fn build_client() -> Result<Client, AppError> {
    let cert = Certificate::from_pem(AK_INTERMEDIATE_PEM)
        .map_err(|e| AppError::ScraperError(format!("load AK intermediate cert: {e}")))?;
    Client::builder()
        .tls_certs_merge([cert])
        .build()
        .map_err(|e| AppError::ScraperError(format!("build AK client: {e}")))
}

/// Fetch and parse the Alaska election-information and calendar pages.
///
/// The `_client` parameter is ignored — we build a dedicated client that
/// trusts the bundled GlobalSign RSA OV SSL CA 2018 intermediate.
pub async fn scrape(_client: &Client) -> Result<ScrapedStateData, AppError> {
    let client = build_client()?;

    let election_html = client
        .get(AK_ELECTION_INFO_URL)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; VoteReadyBot/1.0; +https://voteready.app)",
        )
        .send()
        .await
        .map_err(|e| {
            let mut msg = format!("fetch AK election-info failed: {e}");
            let mut src: Option<&dyn std::error::Error> = std::error::Error::source(&e);
            while let Some(s) = src {
                msg.push_str(&format!(" | caused by: {s}"));
                src = s.source();
            }
            AppError::ScraperError(msg)
        })?
        .text()
        .await
        .map_err(|e| AppError::ScraperError(format!("read AK election-info body failed: {e}")))?;

    let calendar_html = client
        .get(AK_CALENDAR_URL)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; VoteReadyBot/1.0; +https://voteready.app)",
        )
        .send()
        .await
        .map_err(|e| {
            let mut msg = format!("fetch AK calendar failed: {e}");
            let mut src: Option<&dyn std::error::Error> = std::error::Error::source(&e);
            while let Some(s) = src {
                msg.push_str(&format!(" | caused by: {s}"));
                src = s.source();
            }
            AppError::ScraperError(msg)
        })?
        .text()
        .await
        .map_err(|e| AppError::ScraperError(format!("read AK calendar body failed: {e}")))?;

    let election_doc = Html::parse_document(&election_html);
    let calendar_doc = Html::parse_document(&calendar_html);

    Ok(ScrapedStateData {
        elections: parse_elections(&election_doc),
        important_dates: parse_important_dates(&calendar_doc),
    })
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

/// Parse the "Upcoming Elections" section from the election-information page.
///
/// Each election is rendered as:
///   `<h4><strong>Primary Election</strong><br>\nAugust 18, 2026</h4>`
///
/// We select every `<h4>` inside `.entry-content`, extract the election name
/// from the `<strong>` child, and the date from the remaining text nodes.
fn parse_elections(document: &Html) -> Vec<StateElection> {
    let h4_sel = Selector::parse(".entry-content h4").unwrap();
    let strong_sel = Selector::parse("strong").unwrap();
    let mut elections = Vec::new();

    for h4 in document.select(&h4_sel) {
        // Election name lives inside the <strong> child.
        let name = match h4.select(&strong_sel).next() {
            Some(s) => collect_text(&s),
            None => continue,
        };

        if name.is_empty() || !name.ends_with("Election") {
            continue;
        }

        // Date is a text node after the <br> — subtract the name from the full
        // h4 text and normalise whitespace.
        let full = collect_text(&h4);
        let date = full
            .replace(&name, "")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ");

        if date.is_empty() || !looks_like_month_date(&date) {
            continue;
        }

        elections.push(StateElection {
            id: None,
            election_name: name.clone(),
            election_type: determine_type(&name),
            election_date: date,
            polls_hours: None,
            registration_deadline: None,
            mail_in_deadline: None,
            state_code: "AK".to_string(),
        });
    }

    elections
}

/// Parse the full election calendar table.
///
/// The calendar page has a `<table class="with_frm_style …">` whose rows have
/// four cells: Date (MM/DD/YYYY) | Event | Notes | Reference.  We store every
/// row that has a non-empty date and event description.
fn parse_important_dates(document: &Html) -> Vec<StateImportantDate> {
    let table_sel = Selector::parse("table.with_frm_style").unwrap();
    let tr_sel = Selector::parse("tr").unwrap();
    let td_sel = Selector::parse("td").unwrap();

    let mut dates = Vec::new();

    if let Some(table) = document.select(&table_sel).next() {
        for row in table.select(&tr_sel) {
            let cells: Vec<String> = row
                .select(&td_sel)
                .map(|td| {
                    collect_text(&td)
                        .split_whitespace()
                        .collect::<Vec<_>>()
                        .join(" ")
                })
                .collect();

            if cells.len() >= 2 && !cells[0].is_empty() && !cells[1].is_empty() {
                let event_date = cells[0].clone();
                let event_description = cells[1].clone();

                // Parse year from MM/DD/YYYY date format.
                let election_year = event_date
                    .split('/')
                    .nth(2)
                    .and_then(|y| y.parse().ok())
                    .unwrap_or_else(chrono_year_fallback);

                dates.push(StateImportantDate {
                    id: None,
                    event_date,
                    event_description,
                    election_year,
                    state_code: "AK".to_string(),
                });
            }
        }
    }

    dates
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Returns true if the string looks like a "Month DD, YYYY" date.
fn looks_like_month_date(s: &str) -> bool {
    const MONTHS: &[&str] = &[
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
    MONTHS.iter().any(|m| s.contains(m))
}

use reqwest::Client;
use scraper::{ElementRef, Html, Selector};

use crate::{
    errors::AppError,
    models::{PaElection, PaImportantDate},
};

const PA_ELECTIONS_URL: &str =
    "https://www.pa.gov/agencies/vote/elections/upcoming-elections";

pub struct ScrapedPaData {
    pub elections: Vec<PaElection>,
    pub important_dates: Vec<PaImportantDate>,
}

/// Fetch and parse the PA upcoming-elections page.
pub async fn scrape(client: &Client) -> Result<ScrapedPaData, AppError> {
    let html = client
        .get(PA_ELECTIONS_URL)
        .header(
            "User-Agent",
            "Mozilla/5.0 (compatible; VoteReadyBot/1.0; +https://voteready.app)",
        )
        .send()
        .await
        .map_err(|e| AppError::ScraperError(format!("fetch failed: {e}")))?
        .text()
        .await
        .map_err(|e| AppError::ScraperError(format!("read body failed: {e}")))?;

    let document = Html::parse_document(&html);

    Ok(ScrapedPaData {
        elections: parse_elections(&document),
        important_dates: parse_important_dates(&document),
    })
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

fn parse_elections(document: &Html) -> Vec<PaElection> {
    let h2_sel = Selector::parse("h2").unwrap();
    let ul_sel = Selector::parse("ul").unwrap();
    let li_sel = Selector::parse("li").unwrap();
    let mut elections = Vec::new();

    for h2 in document.select(&h2_sel) {
        let heading = collect_text(&h2);

        // Headings look like "May 19, 2026, is the Primary Election"
        if !heading.contains("is the") {
            continue;
        }

        let parts: Vec<&str> = heading.splitn(2, ", is the ").collect();
        if parts.len() != 2 {
            continue;
        }
        let election_date = parts[0].trim().to_string();
        let election_name = parts[1].trim().to_string();
        let election_type = determine_type(&election_name);

        let mut polls_hours: Option<String> = None;
        let mut registration_deadline: Option<String> = None;
        let mut mail_in_deadline: Option<String> = None;

        // The h2 and its accompanying ul are siblings inside the same parent div.
        if let Some(parent) = h2.parent().and_then(ElementRef::wrap) {
            if let Some(ul) = parent.select(&ul_sel).next() {
                for li in ul.select(&li_sel) {
                    let text = collect_text(&li);
                    let lower = text.to_lowercase();

                    if lower.contains("polls") {
                        // "Polls are open on election day from 7 A.M. - 8 P.M."
                        if let Some(idx) = text.find("from ") {
                            polls_hours = Some(text[idx + 5..].trim().to_string());
                        }
                    } else if lower.contains("register to vote") {
                        // "Last day to register to vote: May 4, 2026"
                        if let Some(idx) = text.find(':') {
                            registration_deadline =
                                Some(text[idx + 1..].trim().to_string());
                        }
                    } else if lower.contains("mail-in") || lower.contains("absentee ballot") {
                        // "Last day to request a mail-in or absentee ballot: May 12, 2026"
                        if let Some(idx) = text.find(':') {
                            mail_in_deadline = Some(text[idx + 1..].trim().to_string());
                        }
                    }
                }
            }
        }

        elections.push(PaElection {
            id: None,
            election_name,
            election_type,
            election_date,
            polls_hours,
            registration_deadline,
            mail_in_deadline,
            state_code: "PA".to_string(),
        });
    }

    elections
}

fn parse_important_dates(document: &Html) -> Vec<PaImportantDate> {
    let h2_sel = Selector::parse("h2").unwrap();
    let table_sel = Selector::parse("table").unwrap();
    let tr_sel = Selector::parse("tr").unwrap();
    let td_sel = Selector::parse("td").unwrap();

    // Derive the year from "Important Dates for the 2026 Pennsylvania Elections"
    let mut election_year: i32 = chrono_year_fallback();
    for h2 in document.select(&h2_sel) {
        let text = collect_text(&h2);
        if text.contains("Important Dates for the") {
            if let Some(year) = text
                .split_whitespace()
                .find(|w| w.len() == 4 && w.chars().all(|c| c.is_ascii_digit()))
                .and_then(|s| s.parse().ok())
            {
                election_year = year;
            }
            break;
        }
    }

    let mut dates = Vec::new();

    if let Some(table) = document.select(&table_sel).next() {
        for row in table.select(&tr_sel) {
            let cells: Vec<String> = row
                .select(&td_sel)
                .map(|td| collect_text(&td))
                .collect();

            if cells.len() >= 2 && !cells[0].is_empty() && !cells[1].is_empty() {
                dates.push(PaImportantDate {
                    id: None,
                    event_date: cells[0].clone(),
                    event_description: cells[1].clone(),
                    election_year,
                    state_code: "PA".to_string(),
                });
            }
        }
    }

    dates
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

/// Fallback year when the page heading can't be parsed — use the current year.
fn chrono_year_fallback() -> i32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    // Rough year from seconds since epoch (good enough for a fallback)
    1970 + (secs / 31_557_600) as i32
}

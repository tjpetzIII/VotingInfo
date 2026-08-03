use reqwest::Client;
use scraper::{ElementRef, Html, Selector};

use crate::{
    errors::AppError,
    models::{ScrapedStateData, StateElection, StateImportantDate},
    services::scraper_utils::{chrono_year_fallback, collect_text, determine_type},
};

const WEEKDAYS: [&str; 7] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/// Fetch and parse a U.S. Vote Foundation per-state "Election Dates and
/// Deadlines" page (`usvotefoundation.org/{slug}-election-dates-and-deadlines`).
///
/// Wisconsin, Michigan and Ohio's official election sites are either behind
/// a Cloudflare bot challenge (WI) or otherwise unsuited to a static scrape,
/// so these three states are sourced from this nonpartisan third-party
/// aggregator instead. It publishes every state on an identical Drupal
/// template, so the fetch+parse logic lives here once and each state module
/// (`wi_scraper`, `mi_scraper`, `oh_scraper`) just supplies its slug/code.
pub async fn scrape(
    client: &Client,
    state_slug: &str,
    state_code: &str,
) -> Result<ScrapedStateData, AppError> {
    let url = format!("https://www.usvotefoundation.org/{state_slug}-election-dates-and-deadlines");

    let html = client
        .get(&url)
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

    Ok(ScrapedStateData {
        elections: parse_elections(&document, state_code),
        important_dates: parse_important_dates(&document, state_code),
    })
}

// ---------------------------------------------------------------------------
// Internal parsers
// ---------------------------------------------------------------------------

fn normalize_ws(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Strip a leading three-letter weekday abbreviation, e.g. "Tue Aug 11, 2026"
/// -> "Aug 11, 2026", to match the plain-date style the frontend expects.
fn strip_weekday(date: &str) -> String {
    let mut tokens = date.split_whitespace();
    match tokens.next() {
        Some(first) if WEEKDAYS.contains(&first) => tokens.collect::<Vec<_>>().join(" "),
        _ => date.to_string(),
    }
}

/// Scan free-form deadline prose (e.g. "Online by Wed Jul 22, 2026 11:59PM")
/// for the first "Mon DD, YYYY" date and return it without the weekday/time
/// noise. Returns `None` if no recognizable date is found.
fn extract_date(text: &str) -> Option<String> {
    let tokens: Vec<&str> = text.split_whitespace().collect();
    for (i, month) in tokens.iter().enumerate() {
        if !MONTHS.contains(month) {
            continue;
        }
        let day = tokens.get(i + 1)?.trim_end_matches(',');
        let year = tokens
            .get(i + 2)?
            .trim_end_matches(|c: char| !c.is_ascii_digit());
        if !day.is_empty()
            && day.chars().all(|c| c.is_ascii_digit())
            && year.len() == 4
            && year.chars().all(|c| c.is_ascii_digit())
        {
            return Some(format!("{month} {day}, {year}"));
        }
    }
    None
}

fn extract_year(date: &str) -> i32 {
    date.split_whitespace()
        .last()
        .and_then(|y| y.parse().ok())
        .unwrap_or_else(chrono_year_fallback)
}

/// Picks the deadline `<li>` best representing "the standard way to hit this
/// deadline" — the one whose bold label mentions "online" (the fastest,
/// most common option) if present, else just the first `<li>` in the column.
fn pick_deadline_li<'a>(lis: &[ElementRef<'a>]) -> Option<ElementRef<'a>> {
    let b_sel = Selector::parse("b").unwrap();
    lis.iter()
        .find(|li| {
            li.select(&b_sel)
                .next()
                .map(|b| collect_text(&b).to_lowercase().contains("online"))
                .unwrap_or(false)
        })
        .or_else(|| lis.first())
        .copied()
}

fn parse_elections(document: &Html, state_code: &str) -> Vec<StateElection> {
    let election_sel = Selector::parse("#domestic .election").unwrap();
    let h2_sel = Selector::parse("h2").unwrap();
    let col_sel = Selector::parse(".col").unwrap();
    let h3_sel = Selector::parse("h3").unwrap();
    let li_sel = Selector::parse("li").unwrap();

    let mut elections = Vec::new();

    for election in document.select(&election_sel) {
        let Some(h2) = election.select(&h2_sel).next() else {
            continue;
        };
        let heading = normalize_ws(&collect_text(&h2));
        let Some((date_raw, name_raw)) = heading.split_once(" - ") else {
            continue;
        };
        let election_date = strip_weekday(date_raw.trim());
        let election_name = name_raw.trim().to_string();
        let election_type = determine_type(&election_name);

        let mut registration_deadline = None;
        let mut mail_in_deadline = None;

        for col in election.select(&col_sel) {
            let Some(h3) = col.select(&h3_sel).next() else {
                continue;
            };
            let label = normalize_ws(&collect_text(&h3));
            let lis: Vec<ElementRef> = col.select(&li_sel).collect();
            let Some(chosen) = pick_deadline_li(&lis) else {
                continue;
            };
            let text = normalize_ws(&collect_text(&chosen));
            let deadline = extract_date(&text).unwrap_or(text);

            match label.as_str() {
                "Voter Registration Deadline" => registration_deadline = Some(deadline),
                "Absentee Ballot Request Deadline" => mail_in_deadline = Some(deadline),
                _ => {}
            }
        }

        elections.push(StateElection {
            id: None,
            election_name,
            election_type,
            election_date,
            polls_hours: None,
            registration_deadline,
            mail_in_deadline,
            state_code: state_code.to_string(),
        });
    }

    elections
}

fn parse_important_dates(document: &Html, state_code: &str) -> Vec<StateImportantDate> {
    let election_sel = Selector::parse("#domestic .election").unwrap();
    let h2_sel = Selector::parse("h2").unwrap();
    let col_sel = Selector::parse(".col").unwrap();
    let h3_sel = Selector::parse("h3").unwrap();
    let li_sel = Selector::parse("li").unwrap();

    let mut dates = Vec::new();

    for election in document.select(&election_sel) {
        let Some(h2) = election.select(&h2_sel).next() else {
            continue;
        };
        let heading = normalize_ws(&collect_text(&h2));
        let Some((_, name_raw)) = heading.split_once(" - ") else {
            continue;
        };
        let election_name = name_raw.trim();

        for col in election.select(&col_sel) {
            let Some(h3) = col.select(&h3_sel).next() else {
                continue;
            };
            let label = normalize_ws(&collect_text(&h3));
            if label != "Voter Registration Deadline" && label != "Absentee Ballot Request Deadline"
            {
                continue;
            }
            let lis: Vec<ElementRef> = col.select(&li_sel).collect();
            let Some(chosen) = pick_deadline_li(&lis) else {
                continue;
            };
            let text = normalize_ws(&collect_text(&chosen));
            let Some(event_date) = extract_date(&text) else {
                continue;
            };

            dates.push(StateImportantDate {
                id: None,
                event_date: event_date.clone(),
                event_description: format!("{election_name} \u{2014} {label}"),
                election_year: extract_year(&event_date),
                state_code: state_code.to_string(),
            });
        }
    }

    dates
}

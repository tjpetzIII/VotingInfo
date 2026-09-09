use chrono::{Datelike, Local, NaiveDate};

use crate::errors::AppError;
use crate::models::{DataProvenance, ElectionDate, ElectionDatesResponse, ResponseMetadata, StateElection, StateImportantDate};
use crate::services::civic_api::{extract_state_from_address, CivicApiClient};
use crate::services::scraper_utils::STATE_SCRAPERS;
use crate::services::supabase::SupabaseClient;

/// Aggregates every election-related date known for an address: election day and
/// registration deadline from the Civic API, plus (for scraped states) mail-in
/// deadlines and any other important dates collected by the state scrapers.
pub async fn get_election_dates(
    civic: &CivicApiClient,
    supabase: &SupabaseClient,
    address: &str,
    election_id: Option<&str>,
) -> Result<ElectionDatesResponse, AppError> {
    let core = civic.get_core_dates(address, election_id).await?;
    let today = Local::now().date_naive();

    let election_day = core.election_day.as_deref().and_then(parse_flexible_date);

    let mut dates: Vec<ElectionDate> = Vec::new();

    if let Some(day) = election_day {
        push_unique(
            &mut dates,
            ElectionDate {
                label: core
                    .election_name
                    .clone()
                    .unwrap_or_else(|| "Election Day".to_string()),
                category: "election_day".to_string(),
                date: day.to_string(),
                days_remaining: (day - today).num_days(),
            },
        );
    }

    if let Some(deadline) = core
        .registration_deadline
        .as_deref()
        .and_then(parse_flexible_date)
    {
        push_unique(
            &mut dates,
            ElectionDate {
                label: "Voter Registration Deadline".to_string(),
                category: "registration_deadline".to_string(),
                date: deadline.to_string(),
                days_remaining: (deadline - today).num_days(),
            },
        );
    }

    let state_data_used = if let Some(state) = extract_state_from_address(address) {
        augment_from_scraped_data(
            supabase,
            &state,
            election_day,
            today,
            &mut dates,
            core.election_name.as_deref(),
            election_id.is_some(),
        )
        .await
    } else {
        false
    };

    let provenance = match (core.election_day.is_some(), state_data_used) {
        (true, true) => DataProvenance::Mixed,
        (true, false) => DataProvenance::CivicApi,
        (false, true) => DataProvenance::StateScraper,
        (false, false) => DataProvenance::CivicApi,
    };

    dates.sort_by(|a, b| a.date.cmp(&b.date));
    Ok(ElectionDatesResponse {
        metadata: ResponseMetadata::fresh(provenance, state_data_used),
        dates,
    })
}

/// Adds mail-in deadlines and scraped "important dates" for the states we have
/// scrapers for. Silently does nothing if Supabase isn't configured or the
/// state has no scraped data — the endpoint still returns the Civic API dates.
async fn augment_from_scraped_data(
    supabase: &SupabaseClient,
    state: &str,
    election_day: Option<NaiveDate>,
    today: NaiveDate,
    dates: &mut Vec<ElectionDate>,
    election_name: Option<&str>,
    explicit_selection: bool,
) -> bool {
    let Some(config) = STATE_SCRAPERS.iter().find(|c| c.state_code == state) else {
        return false;
    };
    let mut used = false;

    if let Ok(elections) = supabase
        .fetch_all::<StateElection>(&config.elections_table(), Some("election_date.asc"))
        .await
    {
        used |= !elections.is_empty();
        add_mail_in_deadline(
            dates,
            today,
            select_matching_election(
                elections
                    .into_iter()
                    .map(|e| (e.election_name, e.election_date, e.registration_deadline, e.mail_in_deadline)),
                election_day,
                today,
                election_name,
                explicit_selection,
            ),
        );
    }

    if let Ok(important) = supabase
        .fetch_all::<StateImportantDate>(&config.dates_table(), None)
        .await
    {
        used |= !important.is_empty();
        add_important_dates(
            dates,
            today,
            election_day,
            election_name,
            explicit_selection,
            important
                .into_iter()
                .map(|d| (d.event_date, d.event_description, d.election_year)),
        );
    }
    used
}

/// Picks the scraped election matching the selected name and day when explicit
/// context is provided. Without an explicit selection, a known election day is
/// sufficient; when no day is known, the nearest upcoming election is used.
fn select_matching_election<I>(
    elections: I,
    election_day: Option<NaiveDate>,
    today: NaiveDate,
    election_name: Option<&str>,
    explicit_selection: bool,
) -> Option<(Option<String>, Option<String>)>
where
    I: Iterator<Item = (String, String, Option<String>, Option<String>)>,
{
    let mut best: Option<(NaiveDate, Option<String>, Option<String>)> = None;

    for (scraped_name, date_text, registration_deadline, mail_in_deadline) in elections {
        let Some(d) = parse_flexible_date(&date_text) else {
            continue;
        };

        if let Some(day) = election_day {
            if d == day {
                if explicit_selection
                    && election_name.is_some_and(|name| normalize(name) != normalize(&scraped_name))
                {
                    continue;
                }
                return Some((registration_deadline, mail_in_deadline));
            }
            continue;
        }

        if d >= today && best.as_ref().is_none_or(|(bd, _, _)| d < *bd) {
            best = Some((d, registration_deadline, mail_in_deadline));
        }
    }

    best.map(|(_, reg, mail)| (reg, mail))
}

fn add_mail_in_deadline(
    dates: &mut Vec<ElectionDate>,
    today: NaiveDate,
    fields: Option<(Option<String>, Option<String>)>,
) {
    let Some((registration_deadline, mail_in_deadline)) = fields else {
        return;
    };

    // Only add the scraped registration deadline if the Civic API didn't already
    // supply one for this address.
    if !dates.iter().any(|d| d.category == "registration_deadline") {
        if let Some(d) = registration_deadline
            .as_deref()
            .and_then(parse_flexible_date)
        {
            push_unique(
                dates,
                ElectionDate {
                    label: "Voter Registration Deadline".to_string(),
                    category: "registration_deadline".to_string(),
                    date: d.to_string(),
                    days_remaining: (d - today).num_days(),
                },
            );
        }
    }

    if let Some(d) = mail_in_deadline.as_deref().and_then(parse_flexible_date) {
        push_unique(
            dates,
            ElectionDate {
                label: "Mail-In / Absentee Ballot Request Deadline".to_string(),
                category: "mail_in_request_deadline".to_string(),
                date: d.to_string(),
                days_remaining: (d - today).num_days(),
            },
        );
    }
}

fn add_important_dates<I>(
    dates: &mut Vec<ElectionDate>,
    today: NaiveDate,
    election_day: Option<NaiveDate>,
    election_name: Option<&str>,
    explicit_selection: bool,
    rows: I,
) where
    I: Iterator<Item = (String, String, i32)>,
{
    for (event_date, event_description, election_year) in rows {
        if let Some(day) = election_day {
            if election_year != day.year() {
                continue;
            }
            if explicit_selection
                && election_name
                    .is_some_and(|name| !normalize(name).contains(&normalize(&event_description)))
            {
                continue;
            }
        }

        let Some(d) = parse_flexible_date(&event_date) else {
            continue;
        };

        push_unique(
            dates,
            ElectionDate {
                label: event_description.clone(),
                category: classify_category(&event_description).to_string(),
                date: d.to_string(),
                days_remaining: (d - today).num_days(),
            },
        );
    }
}

fn normalize(value: &str) -> String {
    value
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Skips entries that duplicate an existing (category, date) pair already present.
fn push_unique(dates: &mut Vec<ElectionDate>, entry: ElectionDate) {
    if !dates
        .iter()
        .any(|d| d.category == entry.category && d.date == entry.date)
    {
        dates.push(entry);
    }
}

/// Classifies a free-text scraped event description into a date category using
/// simple keyword matching.
fn classify_category(description: &str) -> &'static str {
    let d = description.to_lowercase();

    if d.contains("regist") {
        "registration_deadline"
    } else if (d.contains("mail") || d.contains("absentee"))
        && (d.contains("request") || d.contains("apply") || d.contains("application"))
    {
        "mail_in_request_deadline"
    } else if (d.contains("mail") || d.contains("absentee") || d.contains("ballot"))
        && (d.contains("return")
            || d.contains("receive")
            || d.contains("postmark")
            || d.contains("submit"))
    {
        "mail_in_return_deadline"
    } else if d.contains("early vot")
        && (d.contains("begin") || d.contains("start") || d.contains("open"))
    {
        "early_voting_start"
    } else if d.contains("early vot")
        && (d.contains("end") || d.contains("last day") || d.contains("close"))
    {
        "early_voting_end"
    } else if d.contains("election day")
        || d.contains("general election")
        || d.contains("primary election")
    {
        "election_day"
    } else {
        "general"
    }
}

/// Parses a date string in any of the formats produced by the Civic API or the
/// state scrapers: ISO 8601 (`2026-05-19`), US slash format (`05/19/2026`), or
/// long-form month/day/year (`May 19, 2026`).
fn parse_flexible_date(s: &str) -> Option<NaiveDate> {
    let s = s.trim();
    NaiveDate::parse_from_str(s, "%Y-%m-%d")
        .or_else(|_| NaiveDate::parse_from_str(s, "%m/%d/%Y"))
        .or_else(|_| NaiveDate::parse_from_str(s, "%B %d, %Y"))
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_iso_date() {
        assert_eq!(
            parse_flexible_date("2026-05-19"),
            NaiveDate::from_ymd_opt(2026, 5, 19)
        );
    }

    #[test]
    fn parses_slash_date() {
        assert_eq!(
            parse_flexible_date("05/19/2026"),
            NaiveDate::from_ymd_opt(2026, 5, 19)
        );
    }

    #[test]
    fn parses_month_name_date_padded_day() {
        assert_eq!(
            parse_flexible_date("May 19, 2026"),
            NaiveDate::from_ymd_opt(2026, 5, 19)
        );
    }

    #[test]
    fn parses_month_name_date_unpadded_day() {
        assert_eq!(
            parse_flexible_date("May 4, 2026"),
            NaiveDate::from_ymd_opt(2026, 5, 4)
        );
    }

    #[test]
    fn rejects_garbage() {
        assert_eq!(parse_flexible_date("not a date"), None);
    }

    #[test]
    fn classifies_registration() {
        assert_eq!(
            classify_category("Last day to register to vote"),
            "registration_deadline"
        );
    }

    #[test]
    fn classifies_mail_in_request() {
        assert_eq!(
            classify_category("Last day to request a mail-in or absentee ballot"),
            "mail_in_request_deadline"
        );
    }

    #[test]
    fn classifies_mail_in_return() {
        assert_eq!(
            classify_category("Deadline for county boards to receive mail-in ballots"),
            "mail_in_return_deadline"
        );
    }

    #[test]
    fn classifies_early_voting_start() {
        assert_eq!(
            classify_category("Early voting begins"),
            "early_voting_start"
        );
    }

    #[test]
    fn classifies_early_voting_end() {
        assert_eq!(classify_category("Early voting ends"), "early_voting_end");
    }

    #[test]
    fn classifies_general_fallback() {
        assert_eq!(classify_category("Candidate filing deadline"), "general");
    }

    #[test]
    fn push_unique_skips_duplicate_category_and_date() {
        let mut dates = vec![ElectionDate {
            label: "A".to_string(),
            category: "registration_deadline".to_string(),
            date: "2026-05-04".to_string(),
            days_remaining: 1,
        }];
        push_unique(
            &mut dates,
            ElectionDate {
                label: "B".to_string(),
                category: "registration_deadline".to_string(),
                date: "2026-05-04".to_string(),
                days_remaining: 1,
            },
        );
        assert_eq!(dates.len(), 1);
        assert_eq!(dates[0].label, "A");
    }

    #[test]
    fn explicit_selection_rejects_same_day_different_scraped_election() {
        let day = NaiveDate::from_ymd_opt(2026, 11, 3).unwrap();
        let result = select_matching_election(
            std::iter::once((
                "Primary Election".to_string(),
                "2026-11-03".to_string(),
                Some("2026-10-01".to_string()),
                None,
            )),
            Some(day),
            day,
            Some("General Election"),
            true,
        );
        assert!(result.is_none());
    }

    #[test]
    fn implicit_selection_can_use_matching_day_without_name() {
        let day = NaiveDate::from_ymd_opt(2026, 11, 3).unwrap();
        let result = select_matching_election(
            std::iter::once((
                "General Election".to_string(),
                "2026-11-03".to_string(),
                Some("2026-10-01".to_string()),
                None,
            )),
            Some(day),
            day,
            None,
            false,
        );
        assert_eq!(result.unwrap().0.as_deref(), Some("2026-10-01"));
    }
}

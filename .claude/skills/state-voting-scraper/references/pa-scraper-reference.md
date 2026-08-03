# PA scraper reference

The Pennsylvania scraper is the reference implementation every new state scraper should mirror. This document summarizes the idioms so you don't need to reverse-engineer them every time.

Since VOT-51, the models, route handlers, and `/api/elections/dates` aggregation are **state-agnostic** — they're generic over every entry in `STATE_SCRAPERS`. A new state only adds a scraper module plus a registry entry; it never touches `models/mod.rs`, `routes/scraper.rs`, `main.rs`/`lib.rs` route lines, or `election_dates.rs`.

## Files

- `backend/src/services/pa_scraper.rs` — fetch + parse. Returns the shared `ScrapedStateData`.
- `backend/src/services/scraper_utils.rs` — shared `collect_text`/`determine_type`/`chrono_year_fallback` helpers, the `StateScraperConfig` registry entry type, and the `STATE_SCRAPERS` array that drives route registration.
- `backend/src/routes/scraper.rs` — two generic Axum handlers (`scrape_state`, `get_state_data`) parameterized by a `&'static StateScraperConfig` — not one pair per state.
- `backend/src/models/mod.rs` — shared `StateElection`, `StateImportantDate`, `StateDataResponse`, `ScrapedStateData`, `ScrapeResult` (all state-agnostic; `state_code` is the discriminator).
- `backend/src/services/supabase.rs` — `SupabaseClient::upsert` / `fetch_all`.
- `backend/migrations/001_pa_scraper.sql` — table schema + `set_scraped_at` trigger.
- `backend/src/errors.rs` — `AppError::ScraperError(String)` variant.

## Fetch

```rust
use reqwest::Client;
use scraper::{ElementRef, Html, Selector};

const PA_ELECTIONS_URL: &str = "https://www.pa.gov/agencies/vote/elections/upcoming-elections";

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
```

Every state scraper should:

1. Take a `&reqwest::Client` (do not create one inside the function — the route handler owns the client).
2. Set the `VoteReadyBot/1.0` User-Agent.
3. Wrap both `send` and `text` errors in `AppError::ScraperError(format!(...))`.
4. Return a `Scraped{State}Data` struct containing at least `elections: Vec<{State}Election>` and `important_dates: Vec<{State}ImportantDate>`.

## Parse idioms

### Heading-to-sibling-list walk

```rust
if let Some(parent) = h2.parent().and_then(ElementRef::wrap) {
    if let Some(ul) = parent.select(&ul_sel).next() {
        for li in ul.select(&li_sel) {
            let text = collect_text(&li);
            // ...
        }
    }
}
```

`h2.parent()` returns a `NodeRef`; `ElementRef::wrap` lifts it back to an `ElementRef` so further `.select()` calls work.

### `collect_text`, `determine_type`, `chrono_year_fallback`

All three live in `backend/src/services/scraper_utils.rs`. Import them — do not redefine:

```rust
use crate::services::scraper_utils::{chrono_year_fallback, collect_text, determine_type};
```

`determine_type` maps to four canonical values: `primary`, `general`, `special`, `other`. Keep them consistent so the frontend color map (`typeColors` in `registration-dates/page.tsx`) works across states. `chrono_year_fallback` is used when the page doesn't include an explicit year in its heading.

## Data model

Every state scraper returns the shared model from `backend/src/models/mod.rs` — do not define per-state structs:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateElection {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub election_name: String,
    pub election_type: String,
    pub election_date: String,
    pub polls_hours: Option<String>,
    pub registration_deadline: Option<String>,
    pub mail_in_deadline: Option<String>,
    pub state_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateImportantDate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub event_date: String,
    pub event_description: String,
    pub election_year: i32,
    pub state_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateDataResponse {
    pub elections: Vec<StateElection>,
    pub important_dates: Vec<StateImportantDate>,
}

pub struct ScrapedStateData {
    pub elections: Vec<StateElection>,
    pub important_dates: Vec<StateImportantDate>,
}
```

`state_code` (e.g. `"PA"`) is the discriminator — the frontend renders every state with the same component, so consistency matters. Your new scraper's `parse_elections`/`parse_important_dates` should return `Vec<StateElection>`/`Vec<StateImportantDate>` directly; there is nothing to mirror or rename per state.

## Registry entry (replaces per-state handlers)

There are no `scrape_pa`/`get_pa_data`-style handlers to write. `backend/src/routes/scraper.rs` has two generic handlers, `scrape_state`/`get_state_data`, each taking a `&'static StateScraperConfig`. Adding a state means adding one wrapper function and one array entry in `backend/src/services/scraper_utils.rs`:

```rust
fn scrape_pa(client: &Client) -> ScrapeFuture<'_> {
    Box::pin(super::pa_scraper::scrape(client))
}

pub static STATE_SCRAPERS: &[StateScraperConfig] = &[
    StateScraperConfig { state_code: "PA", scrape: scrape_pa },
    // new states append here
];
```

`backend/src/lib.rs::api_router` loops over `STATE_SCRAPERS` to register `/api/scrape/{state}` and `/api/{state}-elections` for every entry — no route lines to add by hand. `services/election_dates.rs::augment_from_scraped_data` looks up the same registry by `state_code`, so scraped mail-in deadlines and important dates are picked up automatically too.

## Migration

```sql
CREATE TABLE IF NOT EXISTS pa_elections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_name   TEXT    NOT NULL,
    election_type   TEXT    NOT NULL,
    election_date   TEXT    NOT NULL,
    polls_hours     TEXT,
    registration_deadline  TEXT,
    mail_in_deadline       TEXT,
    state_code      TEXT    NOT NULL DEFAULT 'PA',
    scraped_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (election_date, election_type)
);

CREATE TABLE IF NOT EXISTS pa_election_dates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_date          TEXT    NOT NULL,
    event_description   TEXT    NOT NULL,
    election_year       INT     NOT NULL,
    state_code          TEXT    NOT NULL DEFAULT 'PA',
    scraped_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_date, event_description, election_year)
);
```

The `set_scraped_at` function already exists from migration `001`; you do **not** need to recreate it in later migrations — just create the new `BEFORE INSERT OR UPDATE` triggers that call it.

## Routing

Nothing to add here. `backend/src/lib.rs::api_router` (used by both `main()` and the test-only `build_app_router`) loops over `scraper_utils::STATE_SCRAPERS` and registers `/api/scrape/{state}` + `/api/{state}-elections` for every entry. The registry entry you added in `scraper_utils.rs` is the only wiring step.

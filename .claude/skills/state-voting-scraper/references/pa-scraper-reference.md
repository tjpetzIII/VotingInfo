# PA scraper reference

The Pennsylvania scraper is the reference implementation every new state scraper should mirror. This document summarizes the idioms so you don't need to reverse-engineer them every time.

## Files

- `backend/src/services/pa_scraper.rs` — fetch + parse.
- `backend/src/routes/scraper.rs` — Axum handlers (`scrape_pa`, `get_pa_data`).
- `backend/src/models/mod.rs` — `PaElection`, `PaImportantDate`, `PaStateDataResponse`, `ScrapeResult`.
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

### `collect_text`

```rust
fn collect_text(el: &ElementRef) -> String {
    el.text().collect::<Vec<_>>().join("").trim().to_string()
}
```

Copy this verbatim into each scraper module (or promote it to a shared `services::scrape_util` module if more than two scrapers need it).

### `determine_type`

```rust
fn determine_type(election_name: &str) -> String {
    let lower = election_name.to_lowercase();
    if lower.contains("primary") { "primary".to_string() }
    else if lower.contains("general") { "general".to_string() }
    else if lower.contains("special") { "special".to_string() }
    else { "other".to_string() }
}
```

Four canonical values: `primary`, `general`, `special`, `other`. Keep them consistent so the frontend color map (`typeColors` in `registration-dates/page.tsx`) works across states.

### Year fallback

```rust
fn chrono_year_fallback() -> i32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let secs = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
    1970 + (secs / 31_557_600) as i32
}
```

Used when the page doesn't include an explicit year in its heading.

## Data model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaElection {
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
pub struct PaImportantDate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    pub event_date: String,
    pub event_description: String,
    pub election_year: i32,
    pub state_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaStateDataResponse {
    pub elections: Vec<PaElection>,
    pub important_dates: Vec<PaImportantDate>,
}
```

Mirror these struct shapes exactly for each new state — only the type names change. The frontend renders all of them with the same component, so consistency matters.

## Handlers

```rust
pub async fn scrape_pa(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<ScrapeResult>, AppError> {
    let http = reqwest::Client::new();
    let data = pa_scraper::scrape(&http).await?;
    let elections_saved = data.elections.len();
    let dates_saved = data.important_dates.len();
    supabase.upsert("pa_elections", &data.elections).await?;
    supabase.upsert("pa_election_dates", &data.important_dates).await?;
    Ok(Json(ScrapeResult { elections_saved, dates_saved }))
}

pub async fn get_pa_data(
    State(supabase): State<Arc<SupabaseClient>>,
) -> Result<Json<PaStateDataResponse>, AppError> {
    let elections = supabase.fetch_all("pa_elections", Some("election_date.asc")).await?;
    let important_dates = supabase.fetch_all("pa_election_dates", None).await?;
    Ok(Json(PaStateDataResponse { elections, important_dates }))
}
```

Use the same `ScrapeResult` struct for every state's POST handler response — it's already defined in `models/mod.rs`.

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

`backend/src/main.rs` and `backend/src/lib.rs::build_app_router` each need two new lines per state:

```rust
.route("/api/scrape/{state_lower}", post(routes::scraper::scrape_{state_lower}))
.route("/api/{state_lower}-elections", get(routes::scraper::get_{state_lower}_data))
```

Keep them grouped with the existing PA routes for readability.

# File checklist for a new state scraper

Use placeholders:

- `{sl}` — state lowercase, e.g. `al`
- `{Sp}` — PascalCase, e.g. `Al`
- `{SC}` — two-letter uppercase state code, e.g. `AL`
- `{Name}` — full state name, e.g. `Alabama`

## Pre-flight

- [ ] **TLS chain check.** Run `echo | openssl s_client -connect <host>:443 -servername <host> -showcerts 2>/dev/null | grep -c 'BEGIN CERTIFICATE'`. If the count is `1`, the site only sends its leaf cert; follow `references/tls-chain-fix.md` and add `backend/certs/<issuer>.pem` + a `build_client()` that loads it via `add_root_certificate`. If the count is `≥ 2`, skip this.

## Backend

- [ ] `backend/src/services/{sl}_scraper.rs` — new file. Exports `pub async fn scrape(client: &reqwest::Client) -> Result<Scraped{Sp}Data, AppError>` and a `pub struct Scraped{Sp}Data { pub elections: Vec<{Sp}Election>, pub important_dates: Vec<{Sp}ImportantDate> }`. Private `parse_*` functions, private `collect_text`, `determine_type`, `chrono_year_fallback` helpers (copied from `pa_scraper.rs`). URL in a `const {SC}_URL: &str = "…";`. User-Agent `VoteReadyBot/1.0`.

- [ ] `backend/src/services/mod.rs` — add one line:
  ```rust
  pub mod {sl}_scraper;
  ```

- [ ] `backend/src/models/mod.rs` — add three structs, `#[derive(Debug, Clone, Serialize, Deserialize)]` each:
  ```rust
  pub struct {Sp}Election { /* id, election_name, election_type, election_date, polls_hours, registration_deadline, mail_in_deadline, state_code */ }
  pub struct {Sp}ImportantDate { /* id, event_date, event_description, election_year, state_code */ }
  pub struct {Sp}StateDataResponse { pub elections: Vec<{Sp}Election>, pub important_dates: Vec<{Sp}ImportantDate> }
  ```
  Mirror `PaElection`/`PaImportantDate` shape exactly (same field names, same `#[serde(skip_serializing_if = "Option::is_none")]` on `id`). Reuse the existing `ScrapeResult` — do not redefine it.

- [ ] `backend/src/routes/scraper.rs` — add two handlers:
  ```rust
  pub async fn scrape_{sl}(State(supabase): State<Arc<SupabaseClient>>) -> Result<Json<ScrapeResult>, AppError> { … }
  pub async fn get_{sl}_data(State(supabase): State<Arc<SupabaseClient>>) -> Result<Json<{Sp}StateDataResponse>, AppError> { … }
  ```
  Tables: `{sl}_elections`, `{sl}_election_dates`. Order `{sl}_elections` by `election_date.asc`.

- [ ] `backend/src/main.rs` — inside the `api_routes` builder, add (next to the existing PA lines):
  ```rust
  .route("/api/scrape/{sl}", post(routes::scraper::scrape_{sl}))
  .route("/api/{sl}-elections", get(routes::scraper::get_{sl}_data))
  ```

- [ ] `backend/src/lib.rs` — inside `build_app_router`, add the same two routes so tests keep working.

- [ ] `backend/migrations/00X_{sl}_scraper.sql` — new file, number = highest existing + 1. Two tables `{sl}_elections` and `{sl}_election_dates` with the same columns, unique constraints, and `DEFAULT '{SC}'` on `state_code`. Two `CREATE TRIGGER` statements calling the existing `set_scraped_at` function (do **not** redefine the function; it was created in `001`).

## Frontend

- [ ] `frontend/src/lib/api.ts` — append three interfaces (`{Sp}Election`, `{Sp}ImportantDate`, `{Sp}StateDataResponse`) and a `fetch{Sp}Elections()` function. Match the existing PA equivalents.

- [ ] `frontend/src/app/registration-dates/page.tsx`:
  - Add an entry to `STATE_CARDS`: `{ code: "{SC}", name: "{Name}", flag: "🏛️" }` (or a state-specific emoji).
  - If only one extra state is being added, add a second `useQuery` keyed on `open === "{SC}"` and render the existing `Modal` with the new data. If many states are expected, refactor first: move the modal into a `<StateElectionsModal>` component parameterized by data + state name.

## Docs

- [ ] `README.md` — add to the API Endpoints table:
  ```
  | POST | /api/scrape/{sl} | Triggers {Name} election date scrape into Supabase |
  | GET  | /api/{sl}-elections | Returns scraped {Name} election data |
  ```

## Verification commands

```bash
cd backend && cargo clippy --all-targets -- -D warnings
cd backend && cargo test
cd frontend && npx tsc --noEmit
```

All three must pass before marking the scraper done.

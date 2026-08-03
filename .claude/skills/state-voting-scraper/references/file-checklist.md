# File checklist for a new state scraper

Use placeholders:

- `{sl}` — state lowercase, e.g. `al`
- `{Sp}` — PascalCase, e.g. `Al`
- `{SC}` — two-letter uppercase state code, e.g. `AL`
- `{Name}` — full state name, e.g. `Alabama`

## Pre-flight

- [ ] **TLS chain check.** Run `echo | openssl s_client -connect <host>:443 -servername <host> -showcerts 2>/dev/null | grep -c 'BEGIN CERTIFICATE'`. If the count is `1`, the site only sends its leaf cert; follow `references/tls-chain-fix.md` and add `backend/certs/<issuer>.pem` + a `build_client()` that loads it via `add_root_certificate`. If the count is `≥ 2`, skip this.

## Backend

- [ ] `backend/src/services/{sl}_scraper.rs` — new file. Exports `pub async fn scrape(client: &reqwest::Client) -> Result<ScrapedStateData, AppError>` (the shared struct from `models/mod.rs` — do **not** define a per-state `Scraped{Sp}Data`). Private `parse_*` functions returning `Vec<StateElection>`/`Vec<StateImportantDate>` (also shared — do **not** define `{Sp}Election`/`{Sp}ImportantDate`). Import `collect_text`, `determine_type`, `chrono_year_fallback` from `crate::services::scraper_utils` — do **not** redefine them locally. URL in a `const {SC}_URL: &str = "…";`. User-Agent `VoteReadyBot/1.0`.

- [ ] `backend/src/services/mod.rs` — add one line:
  ```rust
  pub mod {sl}_scraper;
  ```

- [ ] `backend/src/services/scraper_utils.rs` — add a one-line wrapper and a registry entry:
  ```rust
  fn scrape_{sl}(client: &Client) -> ScrapeFuture<'_> {
      Box::pin(super::{sl}_scraper::scrape(client))
  }
  ```
  and add `StateScraperConfig { state_code: "{SC}", scrape: scrape_{sl} }` to the `STATE_SCRAPERS` array. This is the **only** registration step — it drives route wiring (`lib.rs::api_router`) and the `/api/elections/dates` scraped-data augmentation automatically. Do not touch `backend/src/models/mod.rs`, `backend/src/routes/scraper.rs`, `backend/src/main.rs`, `backend/src/lib.rs`, or `election_dates.rs` — those are state-agnostic since VOT-51.

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

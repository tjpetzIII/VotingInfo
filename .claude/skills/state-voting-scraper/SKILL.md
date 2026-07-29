---
name: state-voting-scraper
description: Scaffold a new state-level voting-information scraper for the votingApp backend. Use whenever the user provides a state elections or voter-info URL (e.g. sos.alabama.gov, michigan.gov/vote, sos.ca.gov) and asks to scrape, ingest, parse, or add support for that state's election dates / registration deadlines. Drives the site via Playwright MCP to inspect the live DOM, then generates a Rust scraper, models, route handlers, migration, and frontend wiring that mirror the existing PA scraper pattern.
tools: Read, Glob, Grep, Edit, Write, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_close
---

# state-voting-scraper

Generate a new state voting-info scraper for the votingApp backend from a single URL argument. The skill inspects the live page with Playwright MCP, then scaffolds Rust code that follows the existing Pennsylvania pattern so every state scraper shares identical structure, error handling, and storage.

## When to use

Trigger this skill when the user:

- Shares a state voter-info / elections URL and asks to "scrape it", "add this state", "ingest this data", "parse these deadlines", or similar.
- Asks to add a new state to `/registration-dates`.
- Mentions a specific state (Alabama, Michigan, Ohio, …) and a source website together.

Do **not** trigger for dynamic per-address lookups (that is Google Civic's job) — this skill is only for per-state static election-date pages.

## Inputs

One argument: the state elections/voter-info URL.
Example: `https://www.sos.alabama.gov/alabama-votes/voter/election-information`

From the URL and page content, derive:

- `state_code` — two-letter uppercase (`AL`, `MI`, `OH`).
- `state_lower` — lowercase (`al`, `mi`, `oh`). Used for module names, tables, and routes.
- `StatePascal` — PascalCase (`Al`, `Mi`, `Oh`) for Rust struct names.
- `state_name` — full name (`Alabama`).

If any of these are ambiguous, confirm with the user before generating code.

## Workflow

### Phase 1 — Explore the live site

Use Playwright MCP. Do **not** skip this step; selectors must come from the real DOM, not guesses.

1. `mcp__playwright__browser_navigate` to the URL.
2. `mcp__playwright__browser_snapshot` to get the accessibility tree. Scan for:
   - Headings that name upcoming elections and their dates.
   - Tables / lists containing registration deadlines, absentee deadlines, polling hours.
   - Any "important dates" calendar.
3. `mcp__playwright__browser_evaluate` with targeted `querySelectorAll` to extract the exact text and tag structure around the interesting regions. Prefer pulling small JSON (array of `{tag, text, html}`) rather than the full `outerHTML`. Example function body:
   ```js
   () => Array.from(document.querySelectorAll('h1, h2, h3, table, ul, ol'))
     .map(el => ({ tag: el.tagName, text: el.innerText.slice(0, 500) }))
   ```
4. Optionally `mcp__playwright__browser_take_screenshot` for the record.
5. `mcp__playwright__browser_close` when finished.
6. **Pre-flight the TLS chain.** Before generating code, run:
   ```bash
   echo | openssl s_client -connect <host>:443 -servername <host> -showcerts 2>/dev/null \
     | grep -c 'BEGIN CERTIFICATE'
   ```
   If the count is **1**, the server only sends the leaf cert and the scraper will fail with `invalid peer certificate: UnknownIssuer` (the backend uses `rustls-tls`, which does not perform AIA chasing). Read `references/tls-chain-fix.md` and bundle the intermediate in Phase 3.
7. **Summarize** back to the user: the selectors you will use, the fields you can extract, whether the site needs the TLS-chain fix, and anything you could not find.

### Phase 2 — Read the PA reference

Before writing any code, read `references/pa-scraper-reference.md` and the files it points at. Every new scraper must follow the same patterns:

- `reqwest::Client` with `User-Agent: VoteReadyBot/1.0`.
- `scraper::Html` + `Selector` for parsing.
- `collect_text(&ElementRef)` helper for text extraction.
- `determine_type(&str)` for classifying election names.
- `AppError::ScraperError(String)` for parse failures — **always unwrap the full error source chain** into the message (`while let Some(s) = src.source() { msg.push_str(...) }`). Top-level reqwest errors like `"error sending request for url ..."` hide the actual cause (TLS, DNS, connection reset). Without the chain you cannot diagnose production failures.
- Public function `pub async fn scrape(client: &Client) -> Result<Scraped{State}Data, AppError>`.
- Data model with `Option<String>` fields for anything optional on the source page, and `state_code: String` hard-coded to the two-letter code.

### Phase 3 — Generate code

Follow `references/file-checklist.md` for the exact list of files. At a minimum:

1. **`backend/src/services/{state_lower}_scraper.rs`** — new module. Mirror `pa_scraper.rs` structure: constants, `Scraped{StatePascal}Data` struct, `scrape(client)`, private `parse_elections` + `parse_important_dates`, then shared helpers via `super::pa_scraper` if reusable or copied locally. If Phase 1 step 6 found a broken TLS chain, also add a `build_client()` that loads a bundled intermediate via `reqwest::Certificate::from_pem` + `add_root_certificate` (see `references/tls-chain-fix.md`), and ignore the incoming `_client` parameter in favor of the dedicated client.
2. **`backend/src/services/mod.rs`** — add `pub mod {state_lower}_scraper;`.
3. **`backend/src/models/mod.rs`** — add `{StatePascal}Election`, `{StatePascal}ImportantDate`, `{StatePascal}StateDataResponse`. Copy the PA shape exactly so frontend rendering is uniform.
4. **`backend/src/routes/scraper.rs`** — add `scrape_{state_lower}` and `get_{state_lower}_data` handlers. Table names: `{state_lower}_elections` and `{state_lower}_election_dates`.
5. **`backend/src/main.rs`** — add `.route("/api/scrape/{state_lower}", post(routes::scraper::scrape_{state_lower}))` and `.route("/api/{state_lower}-elections", get(routes::scraper::get_{state_lower}_data))`.
6. **`backend/src/lib.rs`** — add the same two routes to `build_app_router` so tests keep working.
7. **`backend/migrations/00X_{state_lower}_scraper.sql`** — new migration, `X` = next number after the highest existing one. Tables `{state_lower}_elections` and `{state_lower}_election_dates` with identical columns and `UNIQUE` constraints to the PA migration, plus matching `set_scraped_at` triggers.
8. **`frontend/src/lib/api.ts`** — export `{StatePascal}Election`, `{StatePascal}ImportantDate`, `{StatePascal}StateDataResponse` interfaces and `fetch{StatePascal}Elections()`.
9. **`frontend/src/app/registration-dates/page.tsx`** — add the state to `STATE_CARDS` and wire a second `useQuery` + modal branch (or factor the existing modal into a reusable component first if adding many states).
10. **`README.md`** — add `POST /api/scrape/{state_lower}` and `GET /api/{state_lower}-elections` to the API endpoint table.

Use existing types and helpers — do not redefine `SupabaseClient`, `AppError`, `collect_text`, etc.

### Phase 4 — Verify

Run these commands and fix any failures before reporting done:

```bash
cd backend && cargo clippy --all-targets -- -D warnings
cd backend && cargo test
cd frontend && npx tsc --noEmit
```

Then summarize for the user:

- The selectors/structure discovered on the live site.
- Every file you created or modified (absolute paths).
- What to run to actually ingest the data (`cargo run`, then `curl -X POST localhost:8080/api/scrape/{state_lower}`).
- Anything fragile on the source page that future maintainers should watch (e.g. year baked into heading, table rendered server-side only on certain subpaths, etc.).

## Reference files

- `references/pa-scraper-reference.md` — annotated walkthrough of the PA implementation.
- `references/file-checklist.md` — per-file checklist with naming conventions and insertion points.
- `references/tls-chain-fix.md` — recipe for sites (like Alabama SOS) that serve only the leaf cert; includes detection, intermediate download, and the `add_root_certificate` pattern.

## Conventions

- **Table naming**: `{state_lower}_elections`, `{state_lower}_election_dates`. Match the PA migration's unique constraints so upserts work.
- **State code**: always the two-letter uppercase code as a `String` field on every row.
- **No dynamic scraping**: this skill always generates compile-time code. It never scrapes at request time without the data being persisted to Supabase first.
- **Respect the source**: set `User-Agent` to `VoteReadyBot/1.0 (+https://voteready.app)` and do not add retry loops that would hammer the site.

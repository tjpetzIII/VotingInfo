# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Spec-driven development

Non-trivial features go through [GitHub Spec Kit](https://github.com/github/spec-kit): `/speckit-specify` →
`/speckit-plan` → `/speckit-tasks` → `/speckit-implement`. Project principles live in
`.specify/memory/constitution.md`; workflow details in `docs/SPEC_KIT.md`.

## Commands

### Frontend (Next.js)

```bash
cd frontend && npm run dev                       # dev server at localhost:3000 (runs from repo root via workspaces)
cd frontend && npm run build      # production build (MUST run from frontend/, not repo root)
cd frontend && npm run lint
cd frontend && npx tsc --noEmit   # type check
cd frontend && npm run test       # Vitest unit tests (lib/api.ts, AddressForm, LocaleContext, ...)
```

### Backend (Rust/Axum)

```bash
cd backend && cargo run        # dev server at localhost:8080
cd backend && cargo build      # compile check
cd backend && cargo test       # run all tests (unit + integration)
cd backend && cargo test --lib # unit tests only (errors, models)
cd backend && cargo test --test integration  # integration tests only
cd backend && cargo clippy     # lint
```

**Tests do not require `GOOGLE_CIVIC_API_KEY`** — integration tests use `wiremock` to mock
the Google Civic API locally. Unit tests have no external dependencies.

### Docker

```bash
docker compose up --build      # run both services
curl localhost:8080/health     # verify backend
```

## Architecture

This repo contains a Next.js frontend and a Rust/Axum backend as two fully independent services with no shared package infrastructure.

### Frontend (`frontend/`)

Next.js 16 App Router with React 19, TypeScript, and Tailwind CSS 3. Uses `next.config.mjs` (`.ts` config is not supported). Built with `output: "standalone"` for Docker. Key files:

- `src/app/layout.tsx` — root shell with VoteReady header/footer and nav links, wraps in `<Providers>` (locale → intl → react-query → auth, see below)
- `src/app/page.tsx` — home page; fetches and lists all available elections via react-query (`queryKey: ["all-elections"]`)
- `src/app/voter-info/page.tsx` — address form (street, city, state, zip) that calls `/api/voter-info` and `/api/registration`, and displays polling locations, contests, and registration info
- `src/app/all-elections/page.tsx` — server redirect to `/`
- `src/app/elections/page.tsx` — address-search page listing contests for an address (`/api/elections`), links into per-contest detail
- `src/app/elections/[contestId]/page.tsx` — single contest detail with full candidate info (`CandidateCard`)
- `src/app/ballot/page.tsx` — sample ballot grouped Federal → State → Local (`/api/ballot`); only linked from nav when `/api/all-elections` returns at least one election
- `src/app/polling/page.tsx` — address form showing polling locations on a map (`PollingMap`, dynamically imported with `ssr: false`) plus `PollingLocationCard` list
- `src/app/dates/page.tsx` — address form showing the aggregated election-date timeline (`/api/elections/dates`), color-coded by category
- `src/app/registration/page.tsx` — redirects to `/voter-info` (registration UI was merged into that page)
- `src/app/registration-dates/page.tsx` — per-state cards (AK/AL/PA today) showing scraped election dates and important dates (`fetchAkElections`/`fetchAlElections`/`fetchPaElections`)
- `src/app/login/page.tsx` — Supabase email/password sign-in and sign-up form (`react-hook-form` + `zod`)
- `src/app/auth/callback/route.ts` — Supabase email-confirmation callback; exchanges the `code` query param for a session, then redirects to `/`
- `src/app/error.tsx` — global client error boundary
- `src/app/not-found.tsx` — global 404 page
- `src/app/loading.tsx` — Suspense fallback spinner
- `src/components/Providers.tsx` — wraps children in `AddressProvider` → `LocaleProvider` → `IntlProvider` (react-intl) → `QueryClientProvider` (retry: 3, exponential backoff) → `AuthProvider`
- `src/components/Header.tsx` — nav bar; reads `useAuth()` for sign-in/sign-out UI and `useLocale()`/`LocaleSwitcher` for the language toggle
- `src/components/AddressForm.tsx` — the shared street/city/state/zip form; owns all address validation and calls `onSubmit(formattedAddressString)`. Accepts an optional `initialValues?: SavedAddress` pre-fill prop (used by `AddressSummary`'s "Change" flow)
- `src/components/AddressSummary.tsx` — shared "Using: {address} · Change" control shown on every address-driven page; reads `useAddress()`, and on "Change" re-opens `AddressForm` pre-filled with the saved values, writing any valid new address back to the shared context
- `src/contexts/AuthContext.tsx` — `AuthProvider`/`useAuth()`; lazily creates the browser Supabase client (SSR has no `window`), tracks `user`/`loading`, exposes `signOut`
- `src/contexts/LocaleContext.tsx` — `LocaleProvider`/`useLocale()`; persists the chosen locale (`en`/`es`) to `localStorage`
- `src/contexts/AddressContext.tsx` — `AddressProvider`/`useAddress()` (VOT-57); holds the single most-recently-entered address as structured `SavedAddress` fields (`street`/`city`/`state`/`zip`), persisted to `localStorage` key `address` and hydrated client-side after mount (SSR-safe, mirrors `LocaleContext`). Exposes `{ address, setAddress, clearAddress }` plus `formatAddress()`/`parseFormattedAddress()` helpers. The seven address-driven pages (`voter-info`, `polling`, `dates`, `elections`, `elections/[contestId]`, `ballot`, `ballot/[contestId]`) auto-fetch from the saved address; on `elections`/`ballot` a `?address=` URL param still takes precedence for that page load
- `src/lib/supabase/client.ts` — `createBrowserClient` from `@supabase/ssr`, for use in Client Components
- `src/lib/supabase/server.ts` — `createServerClient` from `@supabase/ssr`, cookie-bound to the current request, for use in Server Components/route handlers
- `src/messages/{en,es}.ts` — flat `id → string` message maps consumed by `react-intl`'s `IntlProvider`/`FormattedMessage`/`useIntl`
- `src/lib/api.ts` — typed fetch wrappers with standardized error handling; exports `fetchAllElections`, `fetchVoterInfo`, `fetchElections`, `fetchBallot`, `fetchRegistration`, `fetchElectionDates`, `fetchPaElections`, `fetchAlElections`, `fetchAkElections`
- `middleware.ts` (repo root of `frontend/`) — Next.js middleware that refreshes the Supabase session cookie on every request (excludes static assets)

Address format sent to the backend: `"${street}, ${city}, ${state} ${zip}"` — Google's Civic API requires a full street address; city/state/zip alone returns a 400 parseError.

### Backend (`backend/`)

Rust 1.92 + Axum 0.7, listening on `0.0.0.0:8080`. Module layout:

```
src/
  main.rs                        — router wiring, CORS, rate limiting, tracing setup
  lib.rs                         — AppState (civic + supabase), build_app_router() shared by main() and tests
  errors.rs                      — AppError enum (implements IntoResponse)
  middleware.rs                  — log_request: logs method, path, status, duration_ms per request
  models/mod.rs                  — public API types: VoterInfoResponse, Election, PollingLocation, Contest, Candidate,
                                    ElectionsResponse, ContestDetail, CandidateDetail, Channel, ElectionItem,
                                    AllElectionsResponse, BallotResponse/BallotContest/BallotCandidate/BallotLevel,
                                    RegistrationResponse, ElectionDate/ElectionDatesResponse, and the Pa/Al/Ak
                                    Election/ImportantDate/StateDataResponse scraper types
  services/civic_api.rs          — CivicApiClient: wraps reqwest + five moka caches (voter-info, elections,
                                    all-elections, registration, ballot); owns a GeocoderClient and a
                                    StateRegistrationService
  services/geocoder.rs           — GeocoderClient: geocodes polling-location addresses via Nominatim (OpenStreetMap),
                                    24h moka cache, requests serialized ≥1s apart per Nominatim usage policy
  services/state_registration.rs — StateRegistrationService: loads `data/state_registration_urls.json` at compile
                                    time (include_str!) into a state-abbreviation → registration-info lookup table,
                                    used as a fallback when the Civic API has no registration data for an address
  services/election_dates.rs     — get_election_dates(): aggregates Civic API election-day/registration-deadline
                                    dates with scraped PA/AL/AK mail-in deadlines and "important dates" into one
                                    sorted timeline for GET /api/elections/dates
  services/{pa,al,ak}_scraper.rs — one scraper per state: fetches that state's official elections page(s) with
                                    reqwest, parses elections + important dates out of the HTML. The AL and AK
                                    scrapers each bundle a GlobalSign intermediate cert (`backend/certs/*.pem`,
                                    include_bytes!) into their reqwest::Client because those sites' TLS chains
                                    aren't trusted by the default distroless cert store
  services/supabase.rs            — SupabaseClient: thin wrapper over the Supabase PostgREST REST API
                                    (`upsert`/`fetch_all`); reads SUPABASE_URL/SUPABASE_KEY, returns
                                    AppError::Config if either is unset so the app still starts without Supabase
  routes/elections.rs             — GET /api/voter-info, /api/elections, /api/ballot, /api/all-elections,
                                    /api/registration, /api/elections/dates handlers
  routes/scraper.rs               — POST /api/scrape/{pa,al,ak} (run the scraper, upsert into Supabase) and
                                    GET /api/{pa,al,ak}-elections (read back scraped data) handlers
  bin/healthcheck.rs               — TCP connect binary used by Docker healthcheck
data/                             — state_registration_urls.json (registration URL + same-day/online-registration
                                    flags per state) and state_registration_sources.md (citations), compiled into
                                    the binary
migrations/                       — SQL migrations for the pa_elections/al_elections/ak_elections and matching
                                    *_election_dates Supabase tables
supabase/                         — Supabase CLI project config (local dev stack)
```

**Request flow:** Handlers extract `State<Arc<CivicApiClient>>` (or `State<AppState>` when they need both clients) and `Query<AddressQuery>`, delegating to `CivicApiClient`/`SupabaseClient`. `CivicApiClient` checks a `moka::future::Cache` (15-min TTL) before hitting the Google Civic Information API. Five caches, each keyed by address string except where noted: `VoterInfoResponse`, `ElectionsResponse`, `BallotResponse`, `RegistrationResponse`; `AllElectionsResponse` is keyed by the static string `"all"` (no address needed — calls `/civicinfo/v2/elections`). Raw camelCase API types (`Api*` structs) are private to `civic_api.rs`. "VIP Test Election" is filtered out from `get_all_elections` results before caching.

**Google Civic API error mapping in `fetch_raw`:** `parseError` reason → `ValidationError` (422); `invalid` + "Election unknown" message → `NotFound` (404); other non-2xx → `ExternalApiError` (502). Raw JSON is never forwarded to the client. `get_registration` and `get_core_dates` (used by the dates aggregator) both treat `NotFound` as "no Civic API data" rather than propagating it, since they can fall back to static/scraped data.

**`AppError`** variants: `Reqwest` (network), `ExternalApiError { status, message }` (non-2xx from Google or Supabase), `NotFound` (404), `Config` (missing env var), `ValidationError(String)` (422), `RateLimited` (429), `ScraperError(String)` (state scraper couldn't parse a page, 500). All return JSON `{ "error": "...", "code": "..." }`.

**Rate limiting:** `tower_governor` 0.4, per-IP, `.period(Duration::from_secs(2)).burst_size(30)` = 30 req/min sustained with burst of 30. Applied only to `/api/*` routes via nested router. Uses `SmartIpKeyExtractor` (reads X-Forwarded-For, X-Real-IP, or peer addr). Requires `into_make_service_with_connect_info::<SocketAddr>()` on serve.

**State:** `AppState { civic: Arc<CivicApiClient>, supabase: Arc<SupabaseClient> }` is built at startup in `main()` via `AppState::new(civic_client)` (`lib.rs`) — panics if `GOOGLE_CIVIC_API_KEY` is not set. `SupabaseClient::new()` never panics; it just no-ops with `AppError::Config` until `SUPABASE_URL`/`SUPABASE_KEY` are set. `impl FromRef<AppState>` for each inner `Arc<...>` lets handlers extract only the client they need.

### Data persistence

Google Civic API responses are never persisted — they're only cached in-memory (see the five `moka` caches above) and re-fetched from Google after each cache's TTL expires. State-scraper output (PA/AL/AK election dates) is the only data that's actually persisted: `POST /api/scrape/{pa,al,ak}` scrapes a state's official site and `SupabaseClient::upsert`s the results into that state's `_elections`/`_election_dates` tables (`ON CONFLICT` merge via PostgREST's `?on_conflict=` + `Prefer: resolution=merge-duplicates`); `GET /api/{pa,al,ak}-elections` reads it back with `fetch_all`. `GET /api/elections/dates` reads from both worlds — live Civic API dates plus whatever's already been scraped into Supabase for that address's state — and merges them into one timeline (`services/election_dates.rs`). Nothing currently triggers `/api/scrape/*` on a schedule; it's invoked manually or by an external job runner.

### Authentication

The frontend uses Supabase Auth (email/password) via `@supabase/ssr`. `src/lib/supabase/client.ts` creates a browser client for Client Components (used by `AuthContext` and the login form); `src/lib/supabase/server.ts` creates a cookie-bound server client for Server Components and route handlers. `frontend/middleware.ts` runs `supabase.auth.getUser()` on every non-static request to refresh the session cookie before it expires. `src/app/auth/callback/route.ts` handles the Supabase email-confirmation redirect by exchanging the `code` query param for a session. `AuthContext` exposes `useAuth()` (`user`, `loading`, `signOut`) app-wide via `Providers`; the backend has no concept of auth — Supabase Auth is entirely a frontend/Supabase-project concern and doesn't gate any `/api/*` route.

### Internationalization

The frontend uses `react-intl`. `src/messages/en.ts` and `src/messages/es.ts` export flat `id → string` maps. `Providers` picks the active map based on `LocaleContext`'s `locale` (persisted to `localStorage`, defaults to `en`) and feeds it to `IntlProvider`; components read strings via `useIntl().formatMessage({ id })` or `<FormattedMessage id="..." />`. `LocaleSwitcher` (in the header) is the only UI for changing locale. `IntlProvider` is cast `as any` in `Providers.tsx` — a documented workaround for `react-intl`'s class-component types not lining up with React 19.

### Docker

- Backend Dockerfile: cargo-chef multi-stage build (`lukemathwalker/cargo-chef`) → `gcr.io/distroless/cc-debian12` final image. Includes `healthcheck` binary alongside `backend` binary.
- Frontend Dockerfile: standalone npm install (bypasses workspace lockfile) → Next.js standalone output.
- `docker-compose.yml`: backend healthcheck uses `/app/healthcheck` binary; frontend healthcheck uses `wget`; frontend `depends_on` backend with `condition: service_healthy`.
- CI: `.github/workflows/ci.yml` runs `cargo test`, `cargo clippy`, and `next build` on PRs.

### Environment

- `backend/.env` — `GOOGLE_CIVIC_API_KEY=your_api_key_here` (required; loaded via `dotenvy`); optionally `SUPABASE_URL` and `SUPABASE_KEY` (needed for the scraper/persistence routes and for `/api/elections/dates` to include scraped-state data — everything else works without them)
- `frontend/.env.local` (not committed) — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for auth; client/server Supabase helpers and `middleware.ts` read these, guarded to skip client construction during SSR/prerender when unset)
- CORS allows `http://localhost:3000` only (hardcoded in `main.rs`)
- In Docker Compose the frontend receives `NEXT_PUBLIC_API_URL=http://backend:8080`

### API Endpoints

| Method | Path                             | Description                                                                                                            |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/health`                        | `{"status":"ok"}`                                                                                                       |
| GET    | `/api/voter-info?address=`       | Returns `VoterInfoResponse` JSON                                                                                        |
| GET    | `/api/elections?address=`        | Returns `ElectionsResponse` JSON                                                                                        |
| GET    | `/api/ballot?address=`           | Returns `BallotResponse` JSON — contests sorted Federal → State → Local, full candidate details, empty fields omitted   |
| GET    | `/api/all-elections`             | Returns `AllElectionsResponse` JSON (no address needed)                                                                 |
| GET    | `/api/registration?address=`     | Returns `RegistrationResponse` JSON — Civic API registration info, falling back to static per-state data when unavailable |
| GET    | `/api/elections/dates?address=`  | Returns `ElectionDatesResponse` JSON — Civic API dates merged with any scraped PA/AL/AK dates, sorted chronologically   |
| POST   | `/api/scrape/pa`                 | Scrapes PA's official elections page, upserts into Supabase, returns `ScrapeResult` (counts saved)                      |
| GET    | `/api/pa-elections`              | Returns `PaStateDataResponse` JSON — scraped PA elections + important dates from Supabase                              |
| POST   | `/api/scrape/al`                 | Scrapes Alabama's official elections page, upserts into Supabase, returns `ScrapeResult`                                |
| GET    | `/api/al-elections`              | Returns `AlStateDataResponse` JSON — scraped AL elections + important dates from Supabase                              |
| POST   | `/api/scrape/ak`                 | Scrapes Alaska's election-info and calendar pages, upserts into Supabase, returns `ScrapeResult`                        |
| GET    | `/api/ak-elections`              | Returns `AkStateDataResponse` JSON — scraped AK elections + important dates from Supabase                              |

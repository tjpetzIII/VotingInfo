# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)

```bash
cd frontend && npm run dev                       # dev server at localhost:3000 (runs from repo root via workspaces)
cd frontend && npm run build      # production build (MUST run from frontend/, not repo root)
cd frontend && npm run lint
cd frontend && npx tsc --noEmit   # type check
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

- `src/app/layout.tsx` — root shell with VoteReady header/footer and nav links, wraps in `<Providers>` (QueryClientProvider)
- `src/app/page.tsx` — home page; fetches and lists all available elections via react-query (`queryKey: ["all-elections"]`)
- `src/app/voter-info/page.tsx` — address form (street, city, state, zip) that calls `/api/voter-info` and displays polling locations and contests
- `src/app/all-elections/page.tsx` — server redirect to `/`
- `src/app/error.tsx` — global client error boundary
- `src/app/not-found.tsx` — global 404 page
- `src/app/loading.tsx` — Suspense fallback spinner
- `src/components/Providers.tsx` — QueryClientProvider wrapper (retry: 3, exponential backoff)
- `src/lib/api.ts` — typed fetch wrappers with standardized error handling; exports `fetchAllElections`, `fetchVoterInfo`, `fetchElections`

Address format sent to the backend: `"${street}, ${city}, ${state} ${zip}"` — Google's Civic API requires a full street address; city/state/zip alone returns a 400 parseError.

### Backend (`backend/`)

Rust 1.92 + Axum 0.7, listening on `0.0.0.0:8080`. Module layout:

```
src/
  main.rs              — router wiring, CORS, rate limiting, tracing setup
  errors.rs            — AppError enum (implements IntoResponse)
  middleware.rs        — log_request: logs method, path, status, duration_ms per request
  models/mod.rs        — public API types: VoterInfoResponse, Election, PollingLocation, Contest, Candidate, ElectionsResponse, ContestDetail, CandidateDetail, Channel, ElectionItem, AllElectionsResponse
  services/civic_api.rs — CivicApiClient: wraps reqwest + three moka caches (voter-info, elections, all-elections)
  routes/elections.rs  — GET /api/voter-info, GET /api/elections, GET /api/all-elections handlers
  bin/healthcheck.rs   — TCP connect binary used by Docker healthcheck
```

**Request flow:** `routes/elections.rs` extracts `State<Arc<CivicApiClient>>` and `Query<AddressQuery>`, delegates to `CivicApiClient`. The client checks a `moka::future::Cache` (15-min TTL) before hitting the Google Civic Information API. Three caches: `VoterInfoResponse` and `ElectionsResponse` keyed by address string; `AllElectionsResponse` keyed by the static string `"all"` (no address needed — calls `/civicinfo/v2/elections`). Raw camelCase API types (`Api*` structs) are private to `civic_api.rs`. "VIP Test Election" is filtered out from `get_all_elections` results before caching.

**Google Civic API error mapping in `fetch_raw`:** `parseError` reason → `ValidationError` (422); `invalid` + "Election unknown" message → `NotFound` (404); other non-2xx → `ExternalApiError` (502). Raw JSON is never forwarded to the client.

**`AppError`** variants: `Reqwest` (network), `ExternalApiError { status, message }` (non-2xx from Google), `NotFound` (404), `Config` (missing env var), `ValidationError(String)` (422), `RateLimited` (429). All return JSON `{ "error": "...", "code": "..." }`.

**Rate limiting:** `tower_governor` 0.4, per-IP, `.period(Duration::from_secs(2)).burst_size(30)` = 30 req/min sustained with burst of 30. Applied only to `/api/*` routes via nested router. Uses `SmartIpKeyExtractor` (reads X-Forwarded-For, X-Real-IP, or peer addr). Requires `into_make_service_with_connect_info::<SocketAddr>()` on serve.

**State:** `Arc<CivicApiClient>` is built at startup in `main()` — panics if `GOOGLE_CIVIC_API_KEY` is not set.

### Docker

- Backend Dockerfile: cargo-chef multi-stage build (`lukemathwalker/cargo-chef`) → `gcr.io/distroless/cc-debian12` final image. Includes `healthcheck` binary alongside `backend` binary.
- Frontend Dockerfile: standalone npm install (bypasses workspace lockfile) → Next.js standalone output.
- `docker-compose.yml`: backend healthcheck uses `/app/healthcheck` binary; frontend healthcheck uses `wget`; frontend `depends_on` backend with `condition: service_healthy`.
- CI: `.github/workflows/ci.yml` runs `cargo test`, `cargo clippy`, and `next build` on PRs.

### Environment

- `backend/.env` — `GOOGLE_CIVIC_API_KEY=your_api_key_here` (required; loaded via `dotenvy`)
- CORS allows `http://localhost:3000` only (hardcoded in `main.rs`)
- In Docker Compose the frontend receives `NEXT_PUBLIC_API_URL=http://backend:8080`

### API Endpoints

| Method | Path                       | Description                                             |
| ------ | -------------------------- | ------------------------------------------------------- |
| GET    | `/health`                  | `{"status":"ok"}`                                       |
| GET    | `/api/voter-info?address=` | Returns `VoterInfoResponse` JSON                        |
| GET    | `/api/elections?address=`  | Returns `ElectionsResponse` JSON                        |
| GET    | `/api/all-elections`       | Returns `AllElectionsResponse` JSON (no address needed) |

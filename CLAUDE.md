# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
```bash
npm run dev          # dev server at localhost:3000 (runs from repo root via workspaces)
npm run build        # production build
cd frontend && npm run lint
cd frontend && npx tsc --noEmit   # type check
```

### Backend (Rust/Axum)
```bash
cd backend && cargo run        # dev server at localhost:8080
cd backend && cargo build      # compile check
cd backend && cargo test       # run tests
cd backend && cargo clippy     # lint
```

### Docker
```bash
docker compose up --build      # run both services
curl localhost:8080/health     # verify backend
```

## Architecture

This is an npm workspaces monorepo with a Next.js frontend and a Rust/Axum backend as two independent services.

### Frontend (`frontend/`)
Next.js 16 App Router with React 19, TypeScript, and Tailwind CSS 3. Uses `next.config.mjs` (`.ts` config is not supported). Built with `output: "standalone"` for Docker. Key files:
- `src/app/layout.tsx` — root shell with VoteReady header/footer, wraps in `<Providers>` (QueryClientProvider)
- `src/app/page.tsx` — client component (`"use client"`) with city/state/zip address form
- `src/app/error.tsx` — global client error boundary
- `src/app/not-found.tsx` — global 404 page
- `src/app/loading.tsx` — Suspense fallback spinner
- `src/app/polling/page.tsx` — polling place locator with react-hook-form + react-leaflet map
- `src/app/elections/page.tsx` — contest list with address search + share button
- `src/app/elections/[contestId]/page.tsx` — candidate grid for a specific contest
- `src/components/CandidateCard.tsx` — photo/fallback, party badge, social links, collapsible contact
- `src/components/Providers.tsx` — QueryClientProvider wrapper (retry: 3, exponential backoff)
- `src/lib/api.ts` — typed fetch wrappers with standardized error handling

Pages using `useSearchParams()` must be wrapped in `<Suspense>`. Both elections pages share `queryKey: ["elections", address]` for cache reuse between list and detail views.

The map (react-leaflet) is loaded via `next/dynamic` with `ssr: false` because Leaflet accesses `window` at import time. Uses OpenStreetMap tiles + Nominatim geocoding (no API key needed).

### Backend (`backend/`)
Rust 1.92 + Axum 0.7, listening on `0.0.0.0:8080`. Module layout:

```
src/
  main.rs              — router wiring, CORS, rate limiting, tracing setup
  errors.rs            — AppError enum (implements IntoResponse)
  middleware.rs        — log_request: logs method, path, status, duration_ms per request
  models/mod.rs        — public API types: VoterInfoResponse, Election, PollingLocation, Contest, Candidate, ElectionsResponse, ContestDetail, CandidateDetail, Channel
  services/civic_api.rs — CivicApiClient: wraps reqwest + two moka caches (voter-info, elections)
  routes/elections.rs  — GET /api/voter-info and GET /api/elections handlers
  bin/healthcheck.rs   — TCP connect binary used by Docker healthcheck
```

**Request flow:** `routes/elections.rs` extracts `State<Arc<CivicApiClient>>` and `Query<AddressQuery>`, delegates to `CivicApiClient`. The client checks a `moka::future::Cache` (15-min TTL, keyed by address) before hitting the Google Civic Information API (`/civicinfo/v2/voterinfo`). Two separate caches: one for `VoterInfoResponse`, one for `ElectionsResponse`. Raw camelCase API types (`Api*` structs) are private to `civic_api.rs`.

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
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/api/voter-info?address=` | Returns `VoterInfoResponse` JSON |
| GET | `/api/elections?address=` | Returns `ElectionsResponse` JSON |

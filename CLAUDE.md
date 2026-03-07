# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Next.js)
```bash
npm run dev          # dev server at localhost:3000 (runs from repo root via workspaces)
npm run build        # production build
cd frontend && npm run lint
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
- `src/app/layout.tsx` — root shell with VoteReady header/footer
- `src/app/page.tsx` — client component (`"use client"`) with city/state/zip address form; currently stubs the backend call with an alert (TODO)
- `src/app/error.tsx` — client error boundary
- `src/app/loading.tsx` — Suspense fallback spinner

The form collects city, state (2-char uppercased), and ZIP (digits only, 5-char). The assembled address string is what gets sent to `GET /api/voter-info?address=`.

### Backend (`backend/`)
Rust 1.92 + Axum 0.7, listening on `0.0.0.0:8080`. Module layout:

```
src/
  main.rs              — router wiring, CORS, tracing setup
  errors.rs            — AppError enum (implements IntoResponse)
  models/mod.rs        — public API types: VoterInfoResponse, Election, PollingLocation, Contest, Candidate
  services/civic_api.rs — CivicApiClient: wraps reqwest + moka cache
  routes/elections.rs  — GET /api/voter-info?address= handler
```

**Request flow:** `routes/elections.rs` extracts `State<Arc<CivicApiClient>>` and `Query<VoterInfoQuery>`, delegates to `CivicApiClient::get_voter_info()`. The client checks a `moka::future::Cache` (15-min TTL, keyed by address string) before hitting the Google Civic Information API (`/civicinfo/v2/voterinfo`). Raw camelCase API types (`Api*` structs) are private to `civic_api.rs`; `map_response()` converts them to the snake_case public model types.

**`AppError`** variants: `Reqwest` (network), `ApiError { status, message }` (non-2xx from Google), `NotFound` (404 → address has no election data), `Config` (missing env var). All implement `IntoResponse` returning JSON `{ "error": "..." }`.

**State:** `Arc<CivicApiClient>` is built at startup in `main()` — panics if `GOOGLE_CIVIC_API_KEY` is not set. The cache lives inside `CivicApiClient`.

### Environment
- `backend/.env` — `GOOGLE_CIVIC_API_KEY=your_api_key_here` (required; loaded via `dotenvy`)
- CORS allows `http://localhost:3000` only (hardcoded in `main.rs`)
- In Docker Compose the frontend receives `NEXT_PUBLIC_API_URL=http://backend:8080`

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/api/voter-info?address=` | Returns `VoterInfoResponse` JSON |

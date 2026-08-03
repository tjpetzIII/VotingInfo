# 🗳️ VoteReady

**"Where do I vote, who's on my ballot, and did I miss the registration deadline?"**

VoteReady answers all three — for any US address, for any election — without you having to
untangle a county clerk's website. Type in an address, get your polling place on a map, your full
sample ballot (federal → state → local), and the exact date your state needs your voter
registration by. It's a civic-info aggregator wearing a nicer UI than the government usually
budgets for.

This is a personal/portfolio project built to explore a two-language stack (Rust backend, Next.js
frontend) glued together by a real, occasionally messy third-party API — and to see how far
spec-driven development ([GitHub Spec Kit](https://github.com/github/spec-kit)) plus an AI pair
programmer can take a project like this.

## Why this exists

Voting logistics are scattered across a dozen government websites, half of them last redesigned
around 2004. [Google's Civic Information API](https://developers.google.com/civic-information)
covers a lot of that ground — polling places, contests, candidates — but not registration
deadlines everywhere, and not with any UI at all. VoteReady fills the gap: Civic API data for the
national picture, plus purpose-built scrapers for states (PA, AL, AK so far) where the API comes
up short, merged into one clean timeline.

## What it does

- 🏠 **Address in, answers out** — one form, no login required, results in seconds
- 📍 **Polling place lookup** with an interactive map (Leaflet + OpenStreetMap geocoding)
- 🗳️ **Sample ballots**, grouped Federal → State → Local, with full candidate detail (party,
  channels, photo) on a dedicated page per contest
- 📅 **Election date timeline** — Civic API deadlines merged with scraped state-specific dates
  (mail-in deadlines, "important dates") into one sorted view
- 📝 **Voter registration info**, falling back to curated per-state data when the Civic API has
  nothing for your address
- 🌐 **English / Spanish** via `react-intl`, switchable from the header
- 🔐 **Optional accounts** (Supabase Auth) — the app works fully anonymously; sign-in exists for
  future personalization
- 🤖 **State scrapers** for PA, AL, and AK that pull registration deadlines straight from official
  state sites and persist them to Supabase (built with a repeatable Playwright-driven skill so
  adding a new state is a template fill-in, not a from-scratch job)

## How it's built

Two fully independent services, no shared tooling, talking over plain JSON:

```
┌─────────────────────────┐         ┌──────────────────────────┐
│  Next.js 16 / React 19  │  JSON   │      Rust / Axum 0.7      │
│  frontend/  :3000       │ ──────▶ │      backend/  :8080      │
│                         │         │                            │
│  react-query · Tailwind │         │  moka caches · tower_governor │
│  react-intl · Supabase  │         │  rate limiting · reqwest      │
│  Auth (client)          │         │  Google Civic API · scrapers  │
└─────────────────────────┘         └──────────────┬─────────────┘
                                                     │
                                          ┌──────────▼──────────┐
                                          │      Supabase       │
                                          │  (auth + scraped     │
                                          │   state election     │
                                          │   data persistence)   │
                                          └──────────────────────┘
```

**Backend highlights:** every Google Civic API response is mapped into this project's own types
before it ever reaches a client — no raw upstream JSON, no leaked error internals. Five separate
`moka` in-memory caches (15-min TTL) keep repeat lookups fast and Google's rate limits happy.
Per-IP rate limiting (`tower_governor`) sits in front of every `/api/*` route. State scrapers each
get their own module and, where needed, their own bundled TLS cert for sites with quirky chains.

**Frontend highlights:** every data-fetching page runs through the same react-query conventions
(shared query keys, retry/backoff), so loading and error states feel identical everywhere. i18n is
a flat message-map system, not a heavyweight framework. Supabase Auth is entirely optional — the
backend has no concept of it at all.

See [`CLAUDE.md`](CLAUDE.md) for the full architectural deep-dive (module-by-module).

## Tech stack

| | |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · react-query · react-intl · react-hook-form + zod · Leaflet |
| **Backend** | Rust 1.92 · Axum 0.7 · Tokio · reqwest · moka (caching) · tower_governor (rate limiting) |
| **Data** | Google Civic Information API · Supabase (Postgres + Auth) · custom scrapers (PA/AL/AK) |
| **Testing** | Vitest + Testing Library (frontend) · `cargo test` with `wiremock`-mocked API (backend) — no live API keys needed to run either suite |
| **Ops** | Docker Compose · cargo-chef multi-stage builds · GitHub Actions CI |
| **Process** | Spec-driven development via [GitHub Spec Kit](https://github.com/github/spec-kit) — see `specs/` and `docs/SPEC_KIT.md` |

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) 1.92+
- [Docker](https://www.docker.com/) + Docker Compose (optional, for containerized runs)
- A Google Civic Information API key ([get one here](https://console.cloud.google.com/))
- A [Supabase](https://supabase.com/) project (required for auth and scraped state data)

## Setup

### 1. Add your backend API key

Create `backend/.env`:

```
GOOGLE_CIVIC_API_KEY=your_api_key_here
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Add your frontend environment variables

Create `frontend/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Install frontend dependencies

```bash
cd frontend && npm install
```

### 4. Run database migrations

```bash
# Apply Supabase migrations in supabase/migrations/
```

## Running locally

### Frontend (localhost:3000)

```bash
cd frontend && npm run dev
```

### Backend (localhost:8080)

```bash
cd backend && cargo run
```

### Both via Docker

```bash
docker compose up --build
```

The frontend waits for the backend to pass its healthcheck before starting.

## API keys

| Key | Where to get it | Required |
|-----|----------------|----------|
| `GOOGLE_CIVIC_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials | Yes |
| `SUPABASE_URL` | Supabase project settings | Yes (auth + scraper persistence) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API | Yes (backend scraper) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Yes (frontend auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API | Yes (frontend auth) |

Enable the **Google Civic Information API** in your Google Cloud project before using the key.

## Testing

Nothing here needs a live API key to test — that's a hard rule of the project (see
`.specify/memory/constitution.md`), not just a nicety.

### Backend tests

```bash
cd backend && cargo test                    # all tests
cd backend && cargo test --lib              # unit tests only (errors, models)
cd backend && cargo test --test integration # integration tests only (wiremock-backed)
```

### Frontend tests

```bash
cd frontend && npm run test       # Vitest unit tests
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
```

CI (`.github/workflows/ci.yml`) runs `cargo test` + `cargo clippy`, and `next build`, on every PR.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Lists all available elections |
| `/voter-info` | Polling locations, contests, and registration info for an address |
| `/elections` | Address-search page listing contests, linking into per-contest detail |
| `/elections/[contestId]` | Full candidate detail for a single contest |
| `/ballot` | Sample ballot grouped Federal → State → Local |
| `/polling` | Polling locations on an interactive map |
| `/dates` | Aggregated election-date timeline for an address |
| `/registration-dates` | Per-state cards (AK/AL/PA/WI/MI/OH/GA/AZ/NV/NC/FL) with scraped registration deadlines |
| `/login` | Sign in / sign up via Supabase Auth |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/api/voter-info?address=` | Polling locations, contests, and registration info |
| GET | `/api/elections?address=` | Contests for an address |
| GET | `/api/ballot?address=` | Sample ballot, sorted Federal → State → Local |
| GET | `/api/all-elections` | All currently available elections (no address needed) |
| GET | `/api/registration?address=` | Registration info, with static per-state fallback |
| GET | `/api/elections/dates?address=` | Merged Civic API + scraped election-date timeline |
| POST | `/api/scrape/pa` | Scrapes PA's official elections page into Supabase |
| GET | `/api/pa-elections` | Scraped PA election + important-date data |
| POST | `/api/scrape/al` | Scrapes Alabama's official elections page into Supabase |
| GET | `/api/al-elections` | Scraped Alabama election + important-date data |
| POST | `/api/scrape/ak` | Scrapes Alaska's election-info and calendar pages into Supabase |
| GET | `/api/ak-elections` | Scraped Alaska election + important-date data |
| POST | `/api/scrape/wi` | Scrapes Wisconsin's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/wi-elections` | Scraped Wisconsin election + important-date data |
| POST | `/api/scrape/mi` | Scrapes Michigan's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/mi-elections` | Scraped Michigan election + important-date data |
| POST | `/api/scrape/oh` | Scrapes Ohio's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/oh-elections` | Scraped Ohio election + important-date data |
| POST | `/api/scrape/ga` | Scrapes Georgia's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/ga-elections` | Scraped Georgia election + important-date data |
| POST | `/api/scrape/az` | Scrapes Arizona's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/az-elections` | Scraped Arizona election + important-date data |
| POST | `/api/scrape/nv` | Scrapes Nevada's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/nv-elections` | Scraped Nevada election + important-date data |
| POST | `/api/scrape/nc` | Scrapes North Carolina's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/nc-elections` | Scraped North Carolina election + important-date data |
| POST | `/api/scrape/fl` | Scrapes Florida's election dates (via usvotefoundation.org) into Supabase |
| GET | `/api/fl-elections` | Scraped Florida election + important-date data |

## Roadmap

- [ ] More states in the registration-deadline scraper lineup (built on a repeatable
      Playwright-driven template — see `.claude/skills/state-voting-scraper`)
- [ ] Scheduled (not just on-demand) scraper runs
- [ ] Personalized election reminders once accounts are more than optional

## A note on this project

Every commit, spec, and architectural doc in this repo was built collaboratively with
[Claude Code](https://claude.com/claude-code) — specs and plans in `specs/`, implementation in
the usual places. If you're browsing this as a portfolio piece: the interesting parts are probably
the Civic API error-mapping (`backend/src/services/civic_api.rs`), the five-cache strategy, and
the state-scraper pattern that makes onboarding a new state mostly mechanical.

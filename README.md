# VoteReady

Find your polling place, explore active elections, look up voter registration deadlines, and more — powered by the [Google Civic Information API](https://developers.google.com/civic-information).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) 1.92+
- [Docker](https://www.docker.com/) + Docker Compose (optional, for containerized runs)
- A Google Civic Information API key ([get one here](https://console.cloud.google.com/))
- A [Supabase](https://supabase.com/) project (required for auth and PA election data)

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
| `SUPABASE_URL` | Supabase project settings | Yes (auth + PA scraper) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API | Yes (backend scraper) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings | Yes (frontend auth) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API | Yes (frontend auth) |

Enable the **Google Civic Information API** in your Google Cloud project before using the key.

## Testing

### Backend tests

Run from the `backend/` directory. No API key required — integration tests use a local mock server.

```bash
cd backend && cargo test                    # all tests
cd backend && cargo test --lib              # unit tests only (errors, models)
cd backend && cargo test --test integration # integration tests only
```

**Test coverage:**
- `src/errors.rs` — unit tests for each `AppError` variant → correct HTTP status code
- `src/models/mod.rs` — unit tests for model serialization/deserialization
- `tests/integration.rs` — end-to-end handler tests: `/health`, `/api/all-elections`,
  `/api/voter-info` (success, parse error, election unknown, missing param), `/api/elections`,
  `/api/registration`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Lists all available elections |
| `/voter-info` | Look up polling locations, contests, and voter registration info for your address |
| `/registration-dates` | PA election registration deadlines (scraped data) |
| `/login` | Sign in / sign up via Supabase Auth |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{"status":"ok"}` |
| GET | `/api/voter-info?address=` | Returns `VoterInfoResponse` JSON |
| GET | `/api/elections?address=` | Returns `ElectionsResponse` JSON |
| GET | `/api/all-elections` | Returns `AllElectionsResponse` JSON (no address needed) |
| GET | `/api/registration?address=` | Returns voter registration info and state fallback links |
| POST | `/api/scrape/pa` | Triggers PA election registration deadline scrape into Supabase |
| GET | `/api/pa-elections` | Returns scraped PA election registration deadline data |

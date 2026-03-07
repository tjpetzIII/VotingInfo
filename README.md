# VoteReady

Find your polling place, explore active elections, and look up voter information — powered by the [Google Civic Information API](https://developers.google.com/civic-information).

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) 1.92+
- [Docker](https://www.docker.com/) + Docker Compose (optional, for containerized runs)
- A Google Civic Information API key ([get one here](https://console.cloud.google.com/))

## Setup

### 1. Add your API key

Create `backend/.env`:

```
GOOGLE_CIVIC_API_KEY=your_api_key_here
```

### 2. Install frontend dependencies

```bash
npm install
```

## Running locally

### Frontend (localhost:3000)

```bash
npm run dev
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
  `/api/voter-info` (success, parse error, election unknown, missing param), `/api/elections`

## Pages

| Route | Description |
|-------|-------------|
| `/` | Lists all available elections |
| `/voter-info` | Look up polling locations and contests for your address |

# Implementation Plan: VOT-62

## Technical Context
Rust/Axum/moka backend; Next.js React 19, TypeScript and TanStack Query frontend. No new dependencies or migrations. Official Google voterInfoQuery documentation reviewed 2026-09-09. Worktree branch supplied by parent; SPECIFY_FEATURE_DIRECTORY explicitly set for all Spec Kit scripts.

## Constitution Check
Independent service toolchains, typed mapping, mocked wiremock/Vitest tests, existing explicit CORS/rate limits/15-minute TTL retained. All changed frontend fetch flows use react-query keys. English/Spanish chooser copy. Specifications follow required specs/ convention; runtime documentation in docs/. No secret files read/copied. Gates remain fmt, clippy, lint, typecheck, tests, build.

## Structure and decisions
Backend: models/mod.rs adds ElectionChoicesResponse; errors.rs adds stable selection errors; services/civic_api.rs adds optional-selection variants of existing methods and raw-response cache keyed by address/ID; routes/elections.rs forwards election_id and lib.rs registers discovery under existing protected router. services/election_dates.rs passes ID and filters scraped rows by verified date/name, excluding unlinked general dates for explicit IDs.
Frontend: lib/api.ts optional election arguments and discovery fetcher. contexts/ElectionContext.tsx stores address-bound election selection in sessionStorage, reads electionId on navigation, resets address changes. Shared useElectionSelection(address) discovers choices using react-query; pages use it to enable selected fetches, and ElectionChooser renders loading/error/empty/ambiguity states. Every affected page uses react-query data rather than imperative late-response writes. Contest links carry electionId.

## Phases
1. Specification and official API research/contracts.
2. Backend regression fixtures before typed discovery/selection/cache implementation.
3. Shared frontend selection and deterministic tests before all-page integration.
4. Conservative deadline matching tests and implementation.
5. Full gates, UI inspection, convergence audit and focused commit.

## Resources
Use shared existing Cargo target at /Users/tpetz/Code/AI/votingApp/backend/target per parent disk budget; own frontend .next and root frontend node_modules symlink while lock unchanged. No external services needed in tests.

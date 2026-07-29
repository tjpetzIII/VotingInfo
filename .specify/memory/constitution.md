<!--
Sync Impact Report
- Version change: TEMPLATE → 1.0.0 (initial ratification)
- Principles defined:
  1. Independent Services, Independent Toolchains (new)
  2. No Live External Dependencies in Tests (new)
  3. Never Forward Raw Third-Party Responses (new)
  4. Security & Configuration Discipline (new)
  5. Centralized Documentation (new)
  6. Frontend JSX Comment Convention (new)
- Added sections: Technology & Deployment Constraints, Quality Gates
- Removed sections: none (first ratification from template)
- Templates requiring follow-up: none — plan/spec/tasks templates reference
  the constitution generically and require no structural changes.
- Deferred TODOs: none
-->

# voter-info Constitution

## Core Principles

### I. Independent Services, Independent Toolchains
The frontend (`frontend/`, Next.js) and backend (`backend/`, Rust/Axum) MUST remain two fully
independent services with no shared package infrastructure, shared root `node_modules`, or
cross-service imports. Each service owns its own build, lint, and test toolchain and MUST be
runnable, buildable, and testable in isolation (`cd frontend && npm run build`;
`cd backend && cargo test`). Rationale: this repo has no monorepo tooling (no shared workspace
package, no codegen bridging the two languages); pretending otherwise invites broken builds when
one service's tooling assumptions leak into the other.

### II. No Live External Dependencies in Tests
Automated tests MUST NOT require network access to third-party services or any secret
(`GOOGLE_CIVIC_API_KEY` or equivalent) to pass. Backend integration tests MUST mock the Google
Civic API via `wiremock`; unit tests MUST have no external dependencies. Rationale: tests that
silently depend on a live API key are not reproducible in CI, for new contributors, or in Docker
builds, and produce false negatives whenever the external service is unavailable or rate-limited.

### III. Never Forward Raw Third-Party Responses
The backend MUST map every Google Civic API response — success or error — into this project's own
types (`AppError`, `models::*`) before returning JSON to a client. Raw camelCase API payloads and
raw upstream error bodies MUST NOT reach the frontend. Rationale: this keeps the frontend contract
stable independent of upstream API changes, and prevents leaking upstream error internals
(including anything that might reveal the API key or account details) to end users.

### IV. Security & Configuration Discipline
CORS MUST remain an explicit allowlist (`http://localhost:3000` in development) rather than a
wildcard. Secrets MUST be loaded from environment variables (via `dotenvy` in the backend) and
MUST NEVER be committed — `.env` and equivalents stay git-ignored. All `/api/*` routes MUST remain
behind per-IP rate limiting. Rationale: this is a public-facing civic information tool; a
permissive CORS policy, a leaked API key, or an unthrottled endpoint are the highest-likelihood
incidents for a project of this shape.

### V. Centralized Documentation
Project documentation MUST live under `docs/` at the repo root rather than being scattered across
feature folders or service directories. Rationale: with two independent services, per-service docs
folders fragment quickly; a single root location keeps onboarding and architecture docs
discoverable regardless of which service they describe.

### VI. Frontend JSX Comment Convention
JSX comments (`{/* ... */}`) MUST NOT be placed on the same line immediately following a closing
JSX tag. Rationale: this is a known formatting/lint footgun in this codebase's React/Next.js setup
that has previously caused build or lint failures; treating it as a hard rule avoids repeat
incidents.

## Technology & Deployment Constraints

- Backend: Rust 1.92, Axum 0.7, listening on `0.0.0.0:8080`.
- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 3, using `next.config.mjs`
  (`.ts` config is not supported by this Next.js version).
- Frontend production builds MUST set `output: "standalone"` to support the Docker image.
- Docker Compose MUST orchestrate both services with healthchecks; the frontend's `depends_on`
  the backend MUST use `condition: service_healthy`.
- CORS, rate limiting (`tower_governor`, per-IP), and cache TTLs (`moka`, 15 minutes) are
  load-bearing configuration, not incidental defaults — changes to these require the same scrutiny
  as changes to Principle IV.

## Quality Gates

- CI (`.github/workflows/ci.yml`) MUST run `cargo test`, `cargo clippy`, and `next build` on every
  pull request; a pull request MUST NOT merge with any of these failing.
- `cargo clippy` and `npm run lint` / `npx tsc --noEmit` warnings introduced by a change MUST be
  resolved before merge, not deferred.

## Governance

This constitution supersedes ad hoc practice for this repository. `CLAUDE.md` remains the
canonical quick-reference for day-to-day commands and architecture and MUST be kept in sync
whenever an amendment here changes a command, module boundary, or convention it documents.

Amendments MUST update this file's version according to semantic versioning:
- MAJOR: backward-incompatible principle removal or redefinition.
- MINOR: a new principle or section is added, or existing guidance is materially expanded.
- PATCH: wording clarifications or non-semantic fixes.

Pull requests that touch behavior governed by a principle above MUST note compliance (or explicit,
justified deviation) in the PR description. Deviations require a stated reason and, where
practical, a follow-up plan to bring the code back into compliance.

**Version**: 1.0.0 | **Ratified**: 2026-07-29 | **Last Amended**: 2026-07-29

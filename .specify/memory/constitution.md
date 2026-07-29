<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Principles modified:
  - II. "No Live External Dependencies in Tests" → "Testing Standards" (expanded: retains the
    original no-live-dependency/no-secret rule and adds coverage, determinism, and test-first
    expectations)
- Principles added:
  - III. Code Quality
  - VI. User Experience Consistency
  - VII. Performance Requirements
- Principles renumbered (no content change beyond numbering):
  - III → IV. Never Forward Raw Third-Party Responses
  - IV → V. Security & Configuration Discipline
  - V → VIII. Centralized Documentation
  - VI → IX. Frontend JSX Comment Convention
- Added sections: none (Quality Gates cross-referenced from new Principle III instead of
  duplicated)
- Removed sections: none
- Templates requiring follow-up: none — plan/spec/tasks templates reference the constitution
  generically and require no structural changes.
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

### II. Testing Standards
Automated tests MUST NOT require network access to third-party services or any secret
(`GOOGLE_CIVIC_API_KEY` or equivalent) to pass. Backend integration tests MUST mock the Google
Civic API via `wiremock`; unit tests MUST have no external dependencies. Every new backend route,
model, or error-mapping branch MUST ship with a covering unit or integration test in the same
change; every new frontend data-fetching path (`src/lib/api.ts` and consumers) MUST have a test or,
at minimum, a manually-verified error/loading/success path noted in the PR. Tests MUST be
deterministic — no reliance on real wall-clock sleeps, real network timing, or ordering between
independent test cases. Bug fixes SHOULD add a regression test that fails before the fix and passes
after. Rationale: tests that silently depend on a live API key are not reproducible in CI, for new
contributors, or in Docker builds; flaky or missing tests erode the ability to trust `cargo test`
and `next build` as merge gates.

### III. Code Quality
Code MUST pass `cargo clippy` (backend) and `npm run lint` + `npx tsc --noEmit` (frontend) with no
new warnings before merge — this is the same bar enforced by CI's Quality Gates and is restated
here as a non-negotiable principle, not just a pipeline step. Changes MUST follow existing
formatting conventions (`rustfmt` defaults; the frontend's existing ESLint/Prettier config) rather
than introducing ad hoc style. Dead code, commented-out code, and unused feature flags MUST NOT be
merged. Changes MUST match the scope of the task: no speculative abstractions, no unrelated
refactors bundled into a feature or bugfix PR. Rationale: this is a small, two-service codebase with
no dedicated QA function — lint/type/format gates and scope discipline are what keep it maintainable
as the only enforcement mechanism.

### IV. Never Forward Raw Third-Party Responses
The backend MUST map every Google Civic API response — success or error — into this project's own
types (`AppError`, `models::*`) before returning JSON to a client. Raw camelCase API payloads and
raw upstream error bodies MUST NOT reach the frontend. Rationale: this keeps the frontend contract
stable independent of upstream API changes, and prevents leaking upstream error internals
(including anything that might reveal the API key or account details) to end users.

### V. Security & Configuration Discipline
CORS MUST remain an explicit allowlist (`http://localhost:3000` in development) rather than a
wildcard. Secrets MUST be loaded from environment variables (via `dotenvy` in the backend) and
MUST NEVER be committed — `.env` and equivalents stay git-ignored. All `/api/*` routes MUST remain
behind per-IP rate limiting. Rationale: this is a public-facing civic information tool; a
permissive CORS policy, a leaked API key, or an unthrottled endpoint are the highest-likelihood
incidents for a project of this shape.

### VI. User Experience Consistency
User-facing error, loading, and empty states MUST be consistent across pages and MUST present
actionable, plain-language messages rather than raw API or stack-trace text (see Principle IV for
the backend half of this rule). All pages MUST render within the shared `layout.tsx` header/footer
shell and use the existing Tailwind design tokens rather than one-off styles. Data-fetching views
MUST use the established react-query conventions (shared `queryKey` naming, retry/backoff via
`Providers.tsx`) rather than ad hoc `fetch` calls, so loading/error/retry behavior is uniform app-
wide. Forms (e.g. the voter-info address form) MUST validate and report errors inline rather than
only on submit-failure. Rationale: this app's only value proposition is that a voter can quickly and
confidently get correct information; inconsistent UX (a page that silently fails, or one that looks
different from the rest of the app) undermines that trust as directly as a factual error would.

### VII. Performance Requirements
Endpoints backed by a `moka` cache MUST serve cached responses within the existing 15-minute TTL
rather than re-fetching from the Google Civic API on every request; new endpoints that call an
external API MUST introduce a cache rather than calling it uncached. A single client request MUST
NOT trigger more than one upstream Google Civic API call per distinct resource (no N+1 fan-out).
Per-IP rate limiting bounds (`tower_governor`, 2s period / 30 burst) MUST NOT be loosened without an
explicit, documented reason. Frontend routes MUST use Suspense/loading boundaries (`loading.tsx` or
component-level fallbacks) instead of blocking on client-side data fetches with no feedback.
Rationale: the backend's cost and latency are dominated by upstream API calls; caching discipline
and fan-out limits are what keep the app fast and within Google Civic API usage limits.

### VIII. Centralized Documentation
Project documentation MUST live under `docs/` at the repo root rather than being scattered across
feature folders or service directories. Rationale: with two independent services, per-service docs
folders fragment quickly; a single root location keeps onboarding and architecture docs
discoverable regardless of which service they describe.

### IX. Frontend JSX Comment Convention
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
  as changes to Principle V (and, for cache/rate-limit changes specifically, Principle VII).

## Quality Gates

- CI (`.github/workflows/ci.yml`) MUST run `cargo test`, `cargo clippy`, and `next build` on every
  pull request; a pull request MUST NOT merge with any of these failing.
- `cargo clippy` and `npm run lint` / `npx tsc --noEmit` warnings introduced by a change MUST be
  resolved before merge, not deferred — see Principle III for the underlying rationale.

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

**Version**: 1.1.0 | **Ratified**: 2026-07-29 | **Last Amended**: 2026-07-29

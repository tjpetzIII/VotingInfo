# Implementation Plan: VOT-28 API rate-limit and error hardening

## Technical Context

The Axum backend applies `tower_governor` to `api_router` and maps handler failures through
`AppError`. The implementation will provide a governor error handler that emits the same JSON
contract used by `AppError`, and sanitize client-facing messages for errors originating outside the
application. No new dependency, route, persistence, cache, or frontend change is required.

## Constitution Check

- Independent backend toolchain: PASS.
- Testing standards: PASS; unit tests are deterministic and offline.
- Never forward raw third-party responses: PASS after sanitizing error responses.
- Security/configuration discipline: PASS; explicit CORS and existing governor bounds remain.
- Performance: PASS; no cache or upstream call changes.

## Design

1. Add a reusable safe response mapping in `AppError` that preserves status/code but uses generic
   messages for external, transport, scraper, and configuration failures.
2. Configure `GovernorLayer::error_handler` to translate `GovernorError` to `AppError::RateLimited`
   JSON while preserving governor headers and status semantics.
3. Add focused unit and router tests for safe messages and throttled responses.
4. Record the audit and validation in the VOT-28 tracking note.

## Validation

Run `cargo fmt --check`, `cargo check --locked`, `cargo test --locked`, and
`cargo clippy --locked -- -D warnings` from `backend/`.

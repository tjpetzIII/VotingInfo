# Implementation Plan: Durable election-data refresh worker

## Technical Context

The backend currently scrapes one state per POST and writes directly to state tables. This feature
adds a shared refresh service, durable Supabase control tables, an authenticated manual endpoint,
and a worker binary suitable for a scheduler. Existing reads and state routes remain compatible.

## Constitution Check

- Backend remains independently buildable; no frontend changes required.
- All tests use mocks and deterministic clocks/backoff.
- Raw upstream responses remain internal and status metadata is sanitized.
- Existing CORS, rate limits, cache TTLs, and route contracts remain intact.
- New external operations use bounded concurrency and timeouts.

## Design

1. Add migration tables for refresh leases, immutable snapshot versions, and sanitized status.
2. Add refresh service abstractions for clock, state jobs, lease acquisition, retries, and atomic publish.
3. Add authenticated manual refresh/status routes and a worker binary with environment configuration.
4. Preserve existing state data until a complete successful snapshot is committed.
5. Document scheduler, credentials, migration, and rollback setup in `docs/DEPLOYMENT.md`.

## Validation

Run backend format/check/test/clippy and focused deterministic worker tests.

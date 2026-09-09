# Research: VOT-41

Research date: 2026-09-09.

## Decision: Retain the current resolved dependency
`backend/Cargo.toml` already declares Axum 0.8; the lockfile resolves 0.8.9. A second bump is unnecessary. Reject downgrading and upgrading again: that adds no value and changes the dependency graph needlessly.

## Decision: Audit migration surfaces and test actual state routes
The [official Axum 0.8.9 changelog](https://raw.githubusercontent.com/tokio-rs/axum/axum-v0.8.9/axum/CHANGELOG.md) records the 0.8 path syntax change, Sync requirements for router handlers, extractor changes, and listener-generic serving. Its 0.8.9 minimum Rust version is 1.80, below project baseline 1.92.

Local inspection: all registered paths are literal, including formatted state paths. No Path, Host, optional Query/Path, WebSocket, custom FromRequest, async_trait or old TCP nodelay API appears in production Axum integration. State/FromRef, required Query, Request/Next middleware and Tokio listener serving retain compatible usage. Compile checks validate trait bounds. Existing tests exercise responses, errors, query rejection and health; a new state-route test fills registry/method coverage without calling scrapers. Reject adding dummy parameter routes: they would test the framework rather than this app.

## Decision: Record baseline defects without unrelated fixes
Baseline cargo fmt --check fails across numerous existing files before changes. Scope new test formatting independently and report the repository-wide failure to the parent. Correcting stale architecture version text is within the migration scope and uses constitution PATCH governance.

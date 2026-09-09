# Axum 0.8 migration audit

VOT-41 verifies the backend's existing Axum 0.8 migration. `backend/Cargo.toml`
declares `axum = "0.8"`, and `backend/Cargo.lock` resolves Axum 0.8.9. No second
dependency bump or application behavior change is needed.

The official [Axum 0.8.9 changelog](https://raw.githubusercontent.com/tokio-rs/axum/axum-v0.8.9/axum/CHANGELOG.md)
was checked against the integration points in `backend/src/lib.rs`, `main.rs`,
`routes/`, and `middleware.rs`. The application has no `Path` extractors,
variable route captures, custom `FromRequest` implementations, WebSocket routes,
or legacy serving APIs affected by the 0.7-to-0.8 changes. Generated state
paths are literal strings (`/api/pa-elections`, `/api/scrape/pa`, and so on),
which is the required 0.8 syntax for these routes.

`backend/tests/axum_compatibility.rs` probes every `STATE_SCRAPERS` entry with
the wrong method and verifies the `Allow` header, then confirms unsupported
state paths return 404. Existing integration tests continue to cover health,
query validation, response models, and error mapping.

Validation run for this maintenance:

```text
cargo test --locked
cargo test --locked --test axum_compatibility
cargo build --locked
cargo clippy --locked -- -D warnings
```

The repository-wide `cargo fmt --check` baseline reports pre-existing formatting
drift in unrelated files. The new compatibility test is rustfmt-clean; that
baseline issue is recorded separately in `docs/agent-tracking/VOT-41.md`.

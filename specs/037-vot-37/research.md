# Research: Rand and Logging Dependency Audit

## Decisions

- **Keep the manifest and lockfile unchanged.** The lockfile has `rand 0.9.5` through `governor 0.10.4 → tower_governor 0.8.0`; `rand 0.10.2` exists only on a target-specific path and has no native inverse path. No `rand 0.8` package is resolved. `log 0.4.29`, `tracing 0.1.44`, and `tracing-subscriber 0.3.23` are resolved.
- **Treat the current logging setup as sufficient for this audit.** `main.rs` uses `EnvFilter::try_from_default_env()` with fallback `backend=info,tower_http=warn`, then `tracing_subscriber::fmt::layer()`. Request middleware logs method, path, status, and duration_ms; query strings are excluded.
- **Record Cargo update as blocked by registry connectivity.** `cargo update --dry-run` could not load crates.io because DNS resolution for `index.crates.io` failed. It produced no lockfile mutation, so no update is claimed.

## Evidence

From `backend/` with `CARGO_TARGET_DIR=/Users/tpetz/Code/AI/votingApp/backend/target`:

```text
cargo tree --offline -i rand@0.9.5 --target x86_64-apple-darwin
rand v0.9.5
└── governor v0.10.4
    └── tower_governor v0.8.0
        └── backend v0.1.0

cargo tree --offline -i rand@0.10.2 --target x86_64-apple-darwin
warning: nothing to print.

cargo tree --offline -i rand_core@0.9.5 --target x86_64-apple-darwin
rand_core v0.9.5 → rand v0.9.5 → governor v0.10.4 → tower_governor v0.8.0 → backend

cargo tree --offline -i log@0.4.29 --target x86_64-apple-darwin
log v0.4.29 is reached by tracing/tracing-subscriber and the backend's reqwest/scraper dependency paths.

cargo check --offline
Finished `dev` profile
```

`Cargo.lock` contains no `rand 0.8` package entry. The `rand 0.10.2` entry is present but not reachable on the native target query. Therefore there is no safe, necessary direct dependency change to apply in this checkout.

## Rejected alternatives

- Adding a direct rand dependency would not remediate an absent or inactive path and would increase the dependency surface.
- Forcing a lockfile update without registry access would be unverifiable and could replace already-resolved patched versions.

## Re-evaluation triggers

Repeat this audit when Cargo resolves a rand 0.8 package, `tower_governor`/`governor` changes, logging dependencies change, a new native target or feature is added, or a new advisory changes the relevant patch floor.

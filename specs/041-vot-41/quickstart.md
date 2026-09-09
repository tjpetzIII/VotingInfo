# Validation quickstart

From backend/, with Rust and locked dependencies installed:

```sh
cargo test --locked
cargo build --locked
cargo clippy --locked -- -D warnings
cargo fmt --check
rustfmt --edition 2021 --check tests/axum_compatibility.rs
```

No API keys or live upstreams are needed. Wiremock integration tests bind loopback sockets, so the execution environment must permit local binds. The new route probes never invoke scraping or Supabase. Expected: full test/build/lint success; distinguish any baseline format failure from new-file formatting. See docs/AXUM_08_MIGRATION.md for final evidence.

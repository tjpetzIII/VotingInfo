# Quickstart: Reproduce the VOT-37 Audit

From `backend/`, set the shared target directory and run:

```bash
export CARGO_TARGET_DIR=/Users/tpetz/Code/AI/votingApp/backend/target
cargo tree --offline -i rand@0.9.5 --target x86_64-apple-darwin
cargo tree --offline -i rand@0.10.2 --target x86_64-apple-darwin
cargo check --offline
cargo test --offline --locked
cargo clippy --offline --locked -- -D warnings
cargo fmt --check
```

Expected results: rand 0.9.5 resolves through `governor → tower_governor`; rand 0.10.2 has no native inverse path; check and clippy pass. In this sandbox, the 10 wiremock tests that bind loopback ports fail with `PermissionDenied`, while 61 unit tests pass; formatting reports the repository's existing baseline drift in unrelated files.

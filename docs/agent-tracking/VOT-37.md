---
tags: [voteready, agent-task]
issue: VOT-37
status: complete
---
# VOT-37: Rand and logging dependency audit

## Assignment

Agent: vot_37
Worktree: /private/tmp/voteready-vot-37
Branch: codex/vot-37
Spec directory: specs/037-vot-37

## Evidence and handoff

- `backend/Cargo.lock` resolves `rand 0.9.5` through `governor 0.10.4 → tower_governor 0.8.0 → backend`; no `rand 0.8` package is present.
- `rand 0.10.2` is present only on a target-specific lockfile path; `cargo tree --offline -i rand@0.10.2 --target x86_64-apple-darwin` reports `warning: nothing to print.`
- Relevant logging versions are `log 0.4.29`, `tracing 0.1.44`, `tracing-subscriber 0.3.23`, and `tracing-log 0.2.0`. `main.rs` uses the environment filter with fallback `backend=info,tower_http=warn` and the fmt layer. Request logs contain method, path, status, and duration_ms; query strings are not logged.
- `cargo check --offline` passed. `cargo update --dry-run` could not resolve `index.crates.io` because DNS/network access was unavailable; no lockfile update was performed.
- `cargo clippy --offline --locked -- -D warnings` passed. `cargo test --offline --locked` compiled and ran 71 tests; 61 passed and 10 existing wiremock tests failed at mock-server port binding with sandbox `PermissionDenied`. `cargo fmt --check` reports pre-existing formatting drift across unrelated backend files; this audit introduced no Rust source changes.
- No dependency or application source change was necessary. The detailed evidence and re-evaluation triggers are in [research.md](../../specs/037-vot-37/research.md).

## Risk

The conclusion applies to this manifest, lockfile, and native target selection. Re-run the audit if a rand 0.8 edge appears, governor/tower_governor changes, logging dependencies change, or a new target/feature is introduced.

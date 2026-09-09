---
tags: [voteready, agent-task]
issue: VOT-40
status: in-progress
---
# VOT-40: [Info] cargo-audit false positives: quinn-proto / anyhow / wit-bindgen chain not actually compiled

[Linear](https://linear.app/votinginfo/issue/VOT-40/info-cargo-audit-false-positives-quinn-proto-anyhow-wit-bindgen-chain) · [[Backlog delivery]]

## Assignment

Agent: /root/vot_40
Worktree: /private/tmp/voteready-vot-40
Branch: codex/vot-40
Spec directory: specs/040-vot-40

## Progress

- Spec Kit artifacts completed under `specs/040-vot-40/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/README.md`, `checklists/requirements.md`, and `tasks.md`.
- Current manifest evidence: `reqwest` uses `default-features = false` with `json`, `rustls`, and `query`; `http3` is not enabled.
- `cargo tree -i quinn --target all` and `cargo tree -i quinn-proto --target all` returned `warning: nothing to print.`
- Native `cargo tree -i anyhow --target x86_64-apple-darwin` and `cargo tree -i wit-bindgen --target x86_64-apple-darwin` returned `warning: nothing to print.` Target-all `wit-bindgen` output shows only WASI edges.
- With `CARGO_TARGET_DIR=/Users/tpetz/Code/AI/votingApp/backend/target`, `cargo check --offline` and `cargo build --offline` completed successfully. Initial non-offline graph attempts required Cargo registry access; no application code or manifest was changed.
- Durable evidence is in [`docs/dependency-audits.md`](../dependency-audits.md). Re-evaluate if `reqwest` HTTP/3 or a `wasm32-wasip*` build target is introduced, or dependency resolver behavior changes.

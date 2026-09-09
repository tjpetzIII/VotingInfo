---
tags: [voteready, agent-task]
issue: VOT-28
status: reviewed-integrated
---
# VOT-28: API rate-limit and error hardening

## Assignment

Agent: vot_28
Worktree: /private/tmp/voteready-vot-28
Branch: codex/vot-28
Spec directory: specs/028-vot-28

## Evidence and handoff

- Spec Kit artifacts were created before implementation: `spec.md`, `plan.md`, and `tasks.md`.
- Existing explicit CORS origin, per-IP governor period (2 seconds), burst (30), route table, and
  cache behavior were preserved.
- Governor rejections now use the typed JSON `{error, code}` contract (`error: "Too many requests"`)
  and retain retry/state headers.
- External API, transport, configuration, and scraper details are sanitized at the response boundary;
  focused tests prove supplied upstream text, URLs, and secret-like values do not reach clients.
- `cargo test --locked` passed the 63 deterministic tests that do not bind loopback. Eleven existing
  wiremock tests remain blocked by the sandbox's loopback bind restriction.
- Repository-wide `cargo fmt --check` remains red from pre-existing formatting drift outside this
  change; changed files were formatted with Rust 2021 formatting.

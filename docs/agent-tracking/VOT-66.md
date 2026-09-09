---
tags: [voteready, agent-task]
issue: VOT-66
status: reviewed-integrated
---
# VOT-66: Durable election-data refresh worker

## Assignment

Agent: vot_28  
Worktree: /private/tmp/voteready-vot-66  
Branch: codex/vot-66  
Spec directory: specs/066-vot-66

## Evidence and handoff

- Spec Kit artifacts were created before implementation.
- Added migration control tables, scheduled worker binary, bounded refresh service, authenticated
  manual endpoint, and deployment documentation.
- Refreshes preserve existing per-state data until both scraped collections succeed.
- `cargo check --locked`, `cargo clippy --locked -- -D warnings`, and the focused worker test pass.
- The worker now acquires the durable `refresh_leases` row through the transactional
  `acquire_refresh_lease` RPC, skips active overlap, and releases its owner row on completion.

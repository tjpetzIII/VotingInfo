---
tags: [voteready, agent-task]
issue: VOT-38
status: reviewed-integrated
---
# VOT-38: Patch crossbeam-epoch

Linear: https://linear.app/votinginfo/issue/VOT-38/security-crossbeam-epoch-0918-via-moka-0920

`cargo update --offline -p crossbeam-epoch` updated 0.9.18 to 0.9.20. `cargo check --locked`, `cargo test --locked --lib` (71 passed), and `cargo clippy --locked -- -D warnings` passed. No runtime changes.

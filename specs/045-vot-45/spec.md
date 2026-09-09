# VOT-45 Spec: Routine backend dependency refresh

Review minor and patch updates without changing backend behavior or accidentally widening the lock graph. Preserve Axum 0.8, the existing security fixes, and reproducible `--locked` builds.

## Acceptance

- Current lockfile is reviewed against the ticket's package list.
- Any update is limited to safe compatible versions and validated with tests/clippy.
- Network or registry limitations are documented instead of guessed.

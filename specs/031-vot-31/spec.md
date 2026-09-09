# Feature Specification: Reproducible CI and backend image

**Feature Branch**: `codex/vot-31`

## Requirements

- **FR-001**: Pull requests run backend format, locked tests, and locked clippy gates.
- **FR-002**: Pull requests run frontend frozen install, lint, type-check, tests, and build.
- **FR-003**: Backend Docker builds use pinned toolchain/dependencies and a multi-stage minimal runtime image.
- **FR-004**: CI and image builds use non-secret configuration only and document image-size verification.

## Success Criteria

- SC-001: A clean checkout reproduces all gates with tracked lockfiles.
- SC-002: Runtime image contains only the compiled service and required healthcheck.

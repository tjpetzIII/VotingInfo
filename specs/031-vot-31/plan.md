# Implementation Plan: VOT-31

Update the pull-request workflow to use locked Cargo commands, rustfmt, TypeScript checking, and explicit non-secret build configuration. Replace the backend builder's floating cargo-chef image with a pinned Rust builder and a distroless runtime. Document local image-size inspection and validation limits.

## Constitution Check

Pass: service boundaries, secrets, locked dependencies, and independent toolchains remain intact.

---
tags: [voteready, agent-task]
issue: VOT-64
status: complete
---
# VOT-64: Explain response provenance and freshness

## Assignment

Agent: /root/vot_64  
Worktree: /private/tmp/voteready-vot-64  
Branch: codex/vot-64  
Spec directory: specs/064-vot-64

## Progress

- Audited the existing Civic API mappers, 15-minute caches, registration fallback, and election-date aggregation.
- Created the Spec Kit artifacts under `specs/064-vot-64/`.
- Added typed `ResponseMetadata` with provenance, freshness, and fallback flags to Civic, registration, ballot, elections, all-elections, and election-date responses.
- Preserved the 15-minute caches and marked cache hits as `cached`; state registration fallback is explicitly identified.
- Mirrored the contract in the frontend API types and added English/Spanish source labels.
- Added and tested the reusable `DataSourceNote` component; wired Civic and registration metadata into `/dates`, `/polling`, and `/voter-info`.
- Validation: `cargo check --offline` and focused metadata/compatibility unit tests pass. Full wiremock tests cannot bind ports in this sandbox; frontend dependencies are absent, so `yarn test` could not start.

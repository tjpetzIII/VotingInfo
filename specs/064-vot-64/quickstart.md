# Quickstart

Run `cd backend && cargo test` to exercise mocked response mapping and fallback metadata. Run `cd frontend && yarn test` and `npx tsc --noEmit` for typed consumers. Request `/api/voter-info?address=...` twice against the same process; the first response is `fresh`, and the second is `cached`. A no-election registration request reports `state_registration_fallback`.

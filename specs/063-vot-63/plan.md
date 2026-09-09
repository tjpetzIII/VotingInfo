# Implementation Plan: VOT-63

Extend backend Civic DTO mapping and response models with early voting, drop-off, mail-only, dates, notes, services, coordinates, and finder URL. Geocode only records lacking valid supplied coordinates. Mirror additive types in the frontend and add keyboard-accessible filters using the existing polling map/card components. Use existing independent Rust/Next toolchains, cache, rate limits, i18n conventions, and deterministic mocks.

Touch points: `backend/src/models/mod.rs`, `backend/src/services/civic_api.rs`, `frontend/src/lib/api.ts`, `frontend/src/app/polling/page.tsx`, `frontend/src/components/PollingLocationCard.tsx`, `frontend/src/components/PollingMap.tsx`, and focused tests.

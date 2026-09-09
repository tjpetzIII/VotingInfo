# Implementation plan

Add shared Rust response metadata in `backend/src/models/mod.rs`, populate it at the existing Civic API mapping/cache boundaries, and add metadata to election-date aggregation. The backend continues to map upstream payloads into project models. The frontend mirrors the additive types in `src/lib/api.ts`; no route or cache policy changes are needed. A small shared i18n label allows pages to show provenance without exposing upstream internals.

Validation uses focused Rust unit tests plus existing integration mocks, and frontend typecheck/tests. The change satisfies constitution principles II, IV, V, VI, and VII.

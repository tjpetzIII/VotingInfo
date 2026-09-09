# Implementation Plan: Privacy-aware address deep links

Audit existing App Router query parsing and link builders. Reuse the centralized share URL helper,
ensure address-bearing URLs are produced only by explicit consent, preserve election/contest IDs,
and cover punctuation encoding and clipboard fallback with deterministic tests.

Constitution check: PASS; no secrets, no server persistence, no raw logging, bilingual UI retained.

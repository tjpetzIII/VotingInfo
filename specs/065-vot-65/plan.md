# Implementation Plan: VOT-65

Add backward-compatible typed deadline metadata to backend models and aggregation, preserve scraper semantics, and extend the dates API/UI. Use injected clocks and deterministic fixtures for cutoff, timezone, applicability, legacy, and DST cases. Keep frontend translations in English and Spanish.

## Constitution Check

Pass: independent service toolchains, typed upstream mapping, no live tests, shared shell/query conventions, and documented source provenance are preserved.

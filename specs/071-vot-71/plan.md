# Implementation Plan: VOT-71

Implement a pure serializer in `frontend/src/lib/ics.ts` and consume it from `/dates`. Export selected/all eligible dates through a local Blob download. Use date-only events to avoid timezone/DST shifts and exclude unknown cutoffs. Add localized controls and deterministic helper tests.

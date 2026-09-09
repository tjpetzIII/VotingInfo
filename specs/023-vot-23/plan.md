# Implementation Plan: Scheduled election reminders

Add a date-driven scheduler around the existing typed notification service. It uses bounded
concurrency, retry limits, idempotency keys, and a nonblocking worker entrypoint; Noop remains the
production-safe default and TestEmailProvider is used for deterministic tests. Unsubscribe is checked
before every delivery.

Constitution check: PASS; no live email/API tests, secrets stay in environment, typed errors retained.

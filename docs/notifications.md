# Notification foundation

VOT-21 provides a typed `EmailProvider` boundary and defaults to `NoopEmailProvider`, so the backend never sends outbound mail merely because notification code is initialized. Tests use `TestEmailProvider`. Subscriber records contain only normalized email, address context, opt-in timestamp, and an opaque random unsubscribe token; no ballot credentials or identifiers are accepted.

VOT-23 adds `ReminderScheduler`, which selects supplied due-date events, checks current subscription
and unsubscribe state, retries within a caller-provided bound, and records idempotency keys so a
completed event is not sent twice. The `reminder_worker` binary is intentionally safe by default and
does not dispatch email without an explicitly wired provider.

The current store is process-local foundation code. VOT-22/23 must add encrypted/persistent storage and scheduling as separate changes, with explicit configuration and migration review.

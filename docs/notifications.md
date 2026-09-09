# Notification foundation

VOT-21 provides a typed `EmailProvider` boundary and defaults to `NoopEmailProvider`, so the backend never sends outbound mail merely because notification code is initialized. Tests use `TestEmailProvider`. Subscriber records contain only normalized email, address context, opt-in timestamp, and an opaque random unsubscribe token; no ballot credentials or identifiers are accepted.

The current store is process-local foundation code. VOT-22/23 must add encrypted/persistent storage and scheduling as separate changes, with explicit configuration and migration review.

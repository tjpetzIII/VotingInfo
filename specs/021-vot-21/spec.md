# VOT-21 Notification foundation

## User Story 1 (P1)
As a maintainer, I have a typed, testable email notification foundation that defaults to a no-send sink and protects subscriber privacy for later reminder features.

Requirements: provider abstraction, deterministic test sink, unsubscribe tokens, validated configuration, no real outbound sends by default, and documented persistence/provider extension points. Personal ballot credentials are never stored.

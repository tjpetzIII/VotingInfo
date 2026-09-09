# Feature Specification: Scheduled election reminders

**Feature Branch**: `codex/vot-23`
**Created**: 2026-09-09
**Status**: Approved for implementation

## User Scenarios & Testing
### User Story 1 - Timely reminders (Priority: P1)
An opted-in subscriber receives a reminder for an upcoming election date selected by the scheduler.
### User Story 2 - Safe delivery (Priority: P1)
Retries are bounded and idempotent; unsubscribe state is respected and default/test providers never send real email.

## Requirements
- **FR-001**: The scheduler MUST select due reminders from supplied election dates without live API calls.
- **FR-002**: Delivery MUST be nonblocking, bounded in retries, and idempotent per subscriber/date/kind.
- **FR-003**: Unsubscribed records MUST never receive a reminder.
- **FR-004**: Noop and test providers MUST be safe defaults; tests MUST not send real email.
- **FR-005**: Failures MUST be sanitized in status and logs.

## Success Criteria
- **SC-001**: Re-running a completed date sends zero duplicates.
- **SC-002**: A failed delivery attempts at most the configured retry count.
- **SC-003**: Unsubscribe prevents future sends.

## Assumptions
- Existing typed `NotificationService` and signup store remain the source of subscribers.

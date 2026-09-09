# VOT-71 Calendar export

## User Story 1 (P1)
As a voter, I can download selected eligible election dates as an RFC5545 calendar snapshot without an account or address data.

Requirements: all-day dates use VALUE=DATE with exclusive next-day DTEND; unknown cutoffs are excluded; UIDs are stable, fields escaped/folded and CRLF terminated; copy is bilingual and warns snapshots do not update.

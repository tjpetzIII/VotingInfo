# Implementation Plan: Private voting data by default

Update the address context to use session storage by default with explicit durable opt-in and a
legacy migration path. Broadcast a clear-data event; providers clear React Query and consumers use
the event/version to ignore stale requests. Add bilingual accessible controls and make share builders
address-free unless the user confirms inclusion. Add focused context/UI tests and document behavior.

Constitution: PASS. Frontend remains independent, existing locale/auth/anonymous flows remain, and
all tests are deterministic.

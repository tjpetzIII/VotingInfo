# Research
Source: https://developers.google.com/civic-information/docs/v2/elections/voterInfoQuery (2026-09-09).
Decision: derive choices from address voterinfo election/otherElections. Rationale: documented address-specific otherElections; national elections list is not eligibility evidence.
Decision: query again with explicit electionId after choice. Rationale: same-day ambiguity deliberately omits polling/contest/admin data upstream; explicit election can also return non-live data.
Decision: cache typed raw internal response in addition to mapped outputs, keyed by (address, optional ID). Rationale: share discovery and core dates within TTL without extra resource fan-out.
Decision: exact normalized name/date scraped matching and omit unlinked important dates for explicit selection. Alternative date-only/year filtering cannot disambiguate same-day contests or primary/general deadlines.
Decision: react-query observers own result state. Alternative request counters across several pages duplicate invalidation logic and violate established project fetching convention.

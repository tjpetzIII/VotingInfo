# Data model
No column, identity, relationship, or publication-state changes.

- `<state>_elections`, `<state>_election_dates`: UUID identity, scraped_at triggers; service-owned snapshots.
- `refresh_leases`: name identity, owner and expiry; lease acquisition/release unchanged.
- `refresh_snapshots`: generated bigint identity and UUID version; operator run metadata. Sequence access is part of the permission contract.
- Roles: anon/authenticated are untrusted clients; service_role is the trusted backend with BYPASSRLS. Database owners remain administrative principals.

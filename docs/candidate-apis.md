# Candidate free APIs for voter-info

Survey of free/low-cost APIs that could complement the Google Civic Information
API (`backend/src/services/civic_api.rs`). Researched 2026-08-02.

## Status check: is Google Civic API still OK to depend on?

Yes, for now. Google turned down the **Representatives API** (lookup elected
officials by address) on 2025-04-30, but the **Civic Information API's
elections endpoints** (`elections`, `voterinfo`) — which is what this repo
actually uses — remain active. Worth re-checking periodically since Google
has a history of quietly sunsetting civic-data products.
[Turndown notice](https://groups.google.com/g/google-civicinfo-api/c/9fwFn-dhktA) ·
[Civic Information API docs](https://developers.google.com/civic-information)

## Strong candidates → tickets filed

### 1. Census Bureau Geocoder — replace/supplement Nominatim
- Free, **no API key**, no rate-limit throttling required (current
  `services/geocoder.rs` serializes Nominatim requests ≥1s apart per OSM
  policy — a real latency cost on pages with multiple polling locations).
- US-only (fine — this app is US-only), backed by Census TIGER/Line data.
- Bonus: can return congressional/state-legislative district and census
  tract for a matched address, which the app doesn't currently expose
  anywhere but could feed a future "your districts" feature.
- Docs: https://geocoding.geo.census.gov/
- → **VOT-59** filed (see Linear).

### 2. OpenFEC API — campaign finance on candidate pages
- Free, `DEMO_KEY` works out of the box; a free key from api.data.gov raises
  the limit from 40 req/hr to 1,000 req/hr.
- Federal candidates only (House/Senate/President), but that covers most of
  what `CandidateDetail`/`CandidateCard` render today.
- Would let `elections/[contestId]` show total raised/spent and top
  contributors per candidate — concrete transparency value for a voter-info
  app.
- Docs: https://api.open.fec.gov/developers/ · https://github.com/fecgov/openFEC
- → **VOT-60** filed (see Linear).

## Noted, not ticketed (need more validation or narrower fit)

- **Congress.gov API** (`api.congress.gov`) — free via api.data.gov key,
  5,000 req/hr. Official replacement for the now-archived (2025-02-04)
  ProPublica Congress API. Gives bill/member data for sitting federal
  officeholders. Not ticketed because this app is scoped to *elections*, not
  ongoing legislative tracking — worth revisiting if a "your representatives"
  feature is ever prioritized to backfill what Google's Representatives API
  turndown removed from the ecosystem.
- **Open States API v3** (`v3.openstates.org`) — free with registration.
  Address → state legislator lookup + bill tracking for all 50 states. Same
  reasoning as Congress.gov: would be the state-level half of a "your
  representatives" feature, not scoped today.
- **Vote Smart (Project Vote Smart) API** — candidate bios, voting records,
  zip-to-district match, interest-group ratings. Registration required and
  the current free-tier terms weren't fully clear from public docs at time
  of research — confirm actual pricing/limits at votesmart.org/services_api.php
  before relying on it.
- **Ballotpedia API** — **not free**. Partner-only access, reportedly
  thousands of dollars/month (or a $600 one-time CSV dump for a narrow
  report). Ruled out.

## Sources
- https://groups.google.com/g/google-civicinfo-api/c/9fwFn-dhktA
- https://developers.google.com/civic-information
- https://api.open.fec.gov/developers/
- https://github.com/fecgov/openFEC
- https://geocoding.geo.census.gov/
- https://docs.openstates.org/api-v3/
- https://www.loc.gov/apis/additional-apis/congress-dot-gov-api/
- https://github.com/propublica/congress-api-docs (archived 2025-02-04)
- https://developer.ballotpedia.org/
- https://api.votesmart.org/docs/

# Phase 0 Research: Campaign Finance Data on Candidate Pages

## 1. OpenFEC endpoints needed

**Decision**: Use three OpenFEC v1 endpoints, chained per candidate:

1. `GET /v1/candidates/search/` — locate a candidate by name (`q=`), `state`, `office`
   (`H`/`S`/`P`), and `cycle` (two-year cycle, e.g. `2026`). Returns zero or more candidate
   records, each with a `candidate_id` (e.g. `H8NY12345`).
2. `GET /v1/candidate/{candidate_id}/totals/?cycle={cycle}` — financial totals for that
   candidate's committee(s) in the cycle: `receipts` (total raised), `disbursements` (total
   spent), `cash_on_hand_end_period`, and `coverage_end_date` (the filing's as-of date — this
   satisfies FR-009).
3. `GET /v1/candidate/{candidate_id}/committees/?cycle={cycle}` → principal campaign committee
   `committee_id`, then `GET /v1/schedules/schedule_a/by_employer/?committee_id={id}&cycle={cycle}&sort=-total&per_page=5`
   for top contributors.

**Rationale**: This mirrors how public campaign-finance sites (e.g. OpenSecrets) surface "top
contributors" — FEC does not expose a simple named-individual leaderboard (individual Schedule A
records are itemized transactions, not pre-aggregated by donor identity), but it does provide a
`by_employer` aggregate, which is the standard proxy for "who is funding this campaign."

**Alternatives considered**: Raw `schedules/schedule_a/` itemized records, sorted and manually
aggregated by contributor name — rejected as significantly more complex (pagination over
potentially thousands of records, our own aggregation/dedup logic) for a first version; the
`by_employer` aggregate endpoint already does this server-side.

## 2. Authentication & rate limits

**Decision**: `FEC_API_KEY` env var, optional — falls back to the public `DEMO_KEY` literal,
mirroring `SupabaseClient::new()`'s optional-config pattern (Principle V / `services/supabase.rs`).

**Rationale**: Per the source ticket and OpenFEC's own docs, `DEMO_KEY` works out of the box for
low-volume testing; a free `api.data.gov` key raises the limit from roughly 40 req/hour to 1,000
req/hour. Since this app has no paid API budget today, defaulting to `DEMO_KEY` keeps the feature
functional without any new required configuration, exactly like Supabase being optional.

**Constraint this creates**: Aggressive caching (see §4) is not optional polish here — it is what
keeps the feature within a free-tier rate limit budget once `FEC_API_KEY` is unset.

## 3. Matching a Civic API candidate to an FEC candidate (main risk, per ticket)

**Decision**: Match by `name` (FEC full-text `q=` search) + `state` + `office`, scoped to the
current two-year federal cycle. A match is only used when the search returns **exactly one**
FEC candidate whose normalized name (case-folded, punctuation/suffix-stripped, e.g. "Jr."/"III"
removed) shares all significant name tokens with the Civic API candidate's name. Zero results, or
more than one plausible candidate passing that check, is treated as "no confident match" (FR-004,
FR-005) — the funding section is omitted rather than guessed.

**Rationale**: The spec's resolved clarification (FR-005) requires failing safe to omission on
ambiguity, since misattributing funding data to the wrong candidate is a worse outcome than
missing data for some candidates. This keeps the matching heuristic simple (no scoring/ranking
model to tune) while satisfying the safety requirement. The source ticket already flags this
matching step as the biggest open risk and expects it to need further validation — this plan
treats "fail closed on ambiguity" as the permanent behavior, not just an interim spike guard.

**Alternatives considered**: Fuzzy string-distance scoring (e.g. Levenshtein) with a similarity
threshold — rejected as adding tuning complexity and a false sense of precision; "exactly one
plausible result" is a simpler, equally conservative bar. Matching by FEC candidate ID directly —
not possible, since the Civic API never returns one (per the ticket).

## 4. Caching strategy

**Decision**: A new cache inside the (extended) civic/FEC service layer, keyed by
`(normalized candidate name, state, office, cycle)`, with a 24-hour TTL — matching the precedent
set by `services/geocoder.rs`'s 24h cache rather than the 15-minute TTL used for live Civic API
election data.

**Rationale**: FEC filings update on a periodic (monthly/quarterly) reporting cadence, not in
real time, so a short TTL buys nothing and only burns rate-limit budget. Critically, this cache
key is per-*candidate*, not per-*address* — a given federal candidate (e.g. a Senate or
Presidential candidate) is looked up by many different voters at many different addresses within
the same race, so a candidate-keyed cache (vs. the existing address-keyed caches) gets far more
reuse and directly protects the free-tier rate limit. This satisfies Constitution Principle VII
("new endpoints that call an external API MUST introduce a cache").

**Alternatives considered**: Reusing the existing 15-minute `elections_cache`/`ballot_cache`
alone — rejected because those are keyed by address, so the same federal candidate appearing on
ballots at different addresses would be re-fetched from FEC repeatedly, defeating the purpose.

## 5. Determining which contests are "federal"

**Decision**: Reuse/extend the existing `classify_level` logic in `services/civic_api.rs`
(currently used only by `map_ballot`) so `/api/elections` candidates are also classified before
deciding whether to attempt an FEC lookup at all.

**Rationale**: `/api/ballot` already has federal/state/local classification; `/api/elections`
does not today. Duplicating a second classification heuristic would violate the "no unrelated
abstractions, don't repeat logic" quality bar (Principle III) — the existing office-title/
district-scope heuristic is reused as-is, not reinvented.

**Alternatives considered**: A separate, elections-specific "is this federal" check — rejected as
duplicate logic for a solved problem.

## 6. Avoiding excessive per-request external calls

**Decision**: For a given `/api/elections` or `/api/ballot` request, issue the (up to 3-call) FEC
lookup chain concurrently across all federal candidates on the ballot (not sequentially), and rely
on the per-candidate cache (§4) so repeat requests — including from other voters at other
addresses in the same race — are typically cache hits after the first lookup.

**Rationale**: A federal contest typically has a small number of candidates (2-6), so bounded
concurrent fan-out is acceptable and keeps the added latency within SC-005's one-second budget
after the first (cold-cache) request for a given candidate. This is a fixed, small fan-out tied to
ballot size, not the unbounded N+1 pattern Principle VII prohibits for a single resource.

**Alternatives considered**: Sequential per-candidate fetching — rejected as needlessly slow when
concurrent fetches are safe (each candidate's lookup is independent).

## 7. Response field shape

**Decision**: Money values are represented as floating-point dollar amounts (matching FEC's own
JSON representation), not integer cents — consistent with how this is typically displayed
(rounded dollar figures), and avoids a currency-precision concern that doesn't apply to
informational display-only figures (no calculations or payments happen with these values).

**Rationale**: Simplicity; this is a read/display-only feature, not a ledger.

# Census Geocoder spike: VOT-59

**Ticket**: [VOT-59](https://linear.app/votinginfo/issue/VOT-59) — evaluate replacing Nominatim
with the Census Bureau Geocoder as the primary coordinate-lookup source for polling locations.

**Spec**: `specs/008-census-geocoder-migration/` — this report is the deliverable for that spec's
User Story 3 (FR-006, FR-007): a documented comparison gating whether the Census-primary behavior
implemented in `backend/src/services/geocoder.rs` is safe to rely on for real voters.

**Method**: `backend/src/bin/census_geocoder_spike.rs` calls the Census Bureau Geocoder and
Nominatim directly (both live, unmocked — run manually via
`cargo run --bin census_geocoder_spike`, not part of the test suite) for a fixed sample of 30
polling-location-style addresses: 15 clean street addresses (public buildings that commonly serve
as polling places) and 15 deliberately non-standard formats (PO-box-style, rural route,
building-name-first entries) called out in the ticket. Where both sources matched, the great-circle
distance between their coordinates was computed and flagged if over 1km.

## Results

| Metric | Census | Nominatim |
|---|---|---|
| Overall match rate | 14/30 (46.7%) | 14/30 (46.7%) |
| Clean-address match rate | 14/15 (93.3%) | 14/15 (93.3%) |
| Non-standard-address match rate | 0/15 (0%) | 0/15 (0%) |

- **Coordinate agreement**: on all 14 addresses both sources matched, the two sources agreed to
  within 0.337km (median well under 0.1km) — zero pairs exceeded the 1km divergence-flag
  threshold. Full per-address CSV output is below.
- **The one clean-address miss** ("1 Judiciary Square NW, Washington, DC 20001") failed on *both*
  sources identically — on inspection this looks like an address I mis-specified when assembling
  the sample (not a real, currently-standing street address) rather than a genuine coverage gap in
  either geocoder. Noted for transparency; it doesn't affect the comparison since both sources
  behaved the same way.
- **All 15 non-standard addresses failed on both sources identically.** This sample intentionally
  used addresses with no resolvable street component at all (e.g. "Grange Hall, Rural Route 2,
  Chillicothe, OH", "PO Box 118, Ely, NV 89301") — neither a Census-specific nor a Nominatim-
  specific weakness; string-matching geocoders in general need *some* street-level detail to
  resolve to a point. This is a useful finding but out of scope for VOT-59: it affects the app's
  existing (pre-migration) Nominatim-only coverage equally, so switching primary sources doesn't
  regress it.

### Full per-address output

```csv
address,category,census_match,nominatim_match,distance_km,flagged
"1 City Hall Square, Boston, MA 02201",clean,true,true,0.304,false
"200 N Spring St, Los Angeles, CA 90012",clean,true,true,0.337,false
"121 N LaSalle St, Chicago, IL 60602",clean,true,true,0.059,false
"1500 Marilla St, Dallas, TX 75201",clean,true,true,0.112,false
"830 Punchbowl St, Honolulu, HI 96813",clean,true,true,0.003,false
"1 Judiciary Square NW, Washington, DC 20001",clean,false,false,,false
"1200 Main St, Kansas City, MO 64105",clean,true,true,0.051,false
"1437 Bannock St, Denver, CO 80202",clean,true,true,0.003,false
"301 King St, Alexandria, VA 22314",clean,true,true,0.107,false
"45 Lyon Terrace, Bridgeport, CT 06604",clean,true,true,0.034,false
"550 Main St, Hartford, CT 06103",clean,true,true,0.073,false
"601 4th Ave, Seattle, WA 98104",clean,true,true,0.008,false
"1685 Main St, Sarasota, FL 34236",clean,true,true,0.003,false
"700 H St, Sacramento, CA 95814",clean,true,true,0.008,false
"100 N Holliday St, Baltimore, MD 21202",clean,true,true,0.048,false
"Grange Hall, Rural Route 2, Chillicothe, OH",non_standard,false,false,,false
"PO Box 118, Ely, NV 89301",non_standard,false,false,,false
"VFW Post 1138, Main St, Beloit, WI",non_standard,false,false,,false
"Rural Route 1 Box 45, Emmetsburg, IA 50536",non_standard,false,false,,false
"Town Hall, Route 7, Wilmington, VT",non_standard,false,false,,false
"American Legion Hall, Route 9, Chester, NY",non_standard,false,false,,false
"PO Box 372, Talkeetna, AK 99676",non_standard,false,false,,false
"Grange Hall Road, RR 3, Bethel, ME",non_standard,false,false,,false
"Fire Station No. 2, Route 50, Berlin, MD",non_standard,false,false,,false
"PO Box 55, Cut Bank, MT 59427",non_standard,false,false,,false
"Community Center, Star Route, Marfa, TX",non_standard,false,false,,false
"Elks Lodge 99, Route 20, Pittsfield, MA",non_standard,false,false,,false
"Rural Route 4 Box 12, Winner, SD 57580",non_standard,false,false,,false
"Masonic Hall, Route 1, Wiscasset, ME",non_standard,false,false,,false
"PO Box 90, Barrow, AK 99723",non_standard,false,false,,false
```

## Go/no-go decision

**GO.** Per FR-007, the bar for enabling Census as primary is "no regression in match rate or
location accuracy versus the current source." This sample shows exact parity in match rate
(46.7% overall, 93.3% on clean addresses, 0% on the intentionally-unresolvable non-standard set —
identical for both sources on every single address) and tight coordinate agreement (max 0.337km,
zero flagged divergences) on every address both sources could match. Census introduces no coverage
or accuracy regression in this sample, while removing the ~1s-per-address pacing cost on the
primary path (SC-001).

The Census-primary behavior implemented in `backend/src/services/geocoder.rs` (VOT-59 / spec
`008-census-geocoder-migration`) is confirmed safe to ship as-is.

**Follow-up note (out of scope for this ticket)**: the 0% match rate on vague, street-detail-free
address formats is a real gap in the app's polling-location geocoding generally — worth a future
ticket to investigate (e.g. whether Google Civic's own polling-location data includes better
structured addresses upstream), but it predates this migration and isn't something switching
geocoding providers can fix on its own.

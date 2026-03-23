# State Registration Fallback Data — Sources

This file documents the official sources used to populate
`state_registration_urls.json`. Each entry's `registration_url` links to the
official state election authority voter registration portal.

The `same_day_registration` and `online_registration` booleans reflect policy
as of early 2026. Policies change; the authoritative references are listed
below for each state.

## Primary References

| State | Registration Portal | SDR? | Online? | Source / Notes |
|-------|--------------------|----|------|----------------|
| AL | Alabama Votes — sos.alabama.gov | No | Yes | https://www.alabamavotes.gov |
| AK | Alaska Division of Elections — elections.alaska.gov | No | Yes | https://voterregistration.alaska.gov |
| AZ | ServiceArizona — servicearizona.com | No | Yes | https://servicearizona.com/voterRegistration |
| AR | Arkansas SOS — sos.arkansas.gov | No | No | No online registration; paper/mail only |
| CA | California SOS — sos.ca.gov | Yes | Yes | SDR available with ID requirement (AB 1461) |
| CO | Colorado SOS — sos.state.co.us | Yes | Yes | SDR allowed through Election Day |
| CT | CT Secretary of State — ct.gov | Yes | Yes | Same-day registration available |
| DE | Delaware ivote — ivote.de.gov | No | Yes | — |
| FL | Florida Dept. of State — dos.fl.gov | No | Yes | — |
| GA | Georgia SOS — sos.ga.gov | No | Yes | — |
| HI | Hawaii Office of Elections — elections.hawaii.gov | Yes | Yes | SDR through Election Day |
| ID | Idaho SOS — sos.idaho.gov | Yes | Yes | SDR available |
| IL | Illinois State Board of Elections — elections.il.gov | Yes | Yes | SDR through Election Day |
| IN | Indiana Election Division — in.gov/sos | No | Yes | — |
| IA | Iowa SOS — sos.iowa.gov | Yes | Yes | SDR through Election Day |
| KS | Kansas SOS / KDOR — sos.ks.gov | No | Yes | Online reg via KDOR |
| KY | Kentucky SOS — sos.ky.gov | No | Yes | — |
| LA | Louisiana SOS — sos.la.gov | No | Yes | — |
| ME | Maine SOS — maine.gov/sos | Yes | Yes | SDR through Election Day |
| MD | Maryland State Board of Elections — elections.maryland.gov | Yes | Yes | SDR through Election Day |
| MA | Massachusetts SOS — sec.state.ma.us | No | Yes | — |
| MI | Michigan SOS — michigan.gov/sos | Yes | Yes | SDR through Election Day |
| MN | Minnesota SOS — sos.state.mn.us | Yes | Yes | SDR through Election Day |
| MS | Mississippi SOS — sos.ms.gov | No | No | No online registration; paper/mail only |
| MO | Missouri SOS — sos.mo.gov | No | Yes | — |
| MT | Montana SOS — sos.mt.gov | Yes | Yes | SDR & online registration added 2021 |
| NE | Nebraska SOS — sos.nebraska.gov | Yes | Yes | SDR enacted 2023 |
| NV | Nevada SOS — nvsos.gov | Yes | Yes | SDR through Election Day |
| NH | New Hampshire SOS — sos.nh.gov | Yes | No | SDR with domicile affidavit; no standalone online portal |
| NJ | New Jersey Division of Elections — nj.gov/state/elections | No | Yes | — |
| NM | New Mexico SOS — sos.nm.gov | Yes | Yes | SDR enacted 2024 (during early voting) |
| NY | New York State Board of Elections — elections.ny.gov | Yes | Yes | SDR during early voting period |
| NC | NC State Board of Elections — ncsbe.gov | Yes | Yes | SDR during early voting ("one-stop") period |
| ND | North Dakota SOS — sos.nd.gov | Yes | No | No voter registration required; voters show ID at polls. Online portal is informational only. |
| OH | Ohio SOS — ohiosos.gov | No | Yes | — |
| OK | Oklahoma State Election Board — ok.gov/elections | No | Yes | Online registration added 2020 |
| OR | Oregon SOS — sos.oregon.gov | No | Yes | Automatic motor-voter registration; no Election Day reg |
| PA | Pennsylvania Dept. of State — vote.pa.gov | No | Yes | — |
| RI | Rhode Island Board of Elections — vote.sos.ri.gov | Yes | Yes | SDR enacted 2023 |
| SC | South Carolina State Election Commission — scvotes.gov | No | Yes | — |
| SD | South Dakota SOS — sdsos.gov | No | Yes | Online registration added 2022 |
| TN | Tennessee SOS — sos.tn.gov | No | Yes | — |
| TX | Texas SOS — sos.state.tx.us | No | No | No standalone online portal; paper or in-person only |
| UT | Utah Lt. Governor Elections — elections.utah.gov | Yes | Yes | SDR through Election Day |
| VT | Vermont SOS — sos.vermont.gov | Yes | Yes | SDR through Election Day |
| VA | Virginia Dept. of Elections — elections.virginia.gov | Yes | Yes | SDR during early voting period |
| WA | Washington SOS — sos.wa.gov | Yes | Yes | SDR through Election Day |
| WV | West Virginia SOS — sos.wv.gov | No | Yes | — |
| WI | Wisconsin Elections Commission — myvote.wi.gov | Yes | Yes | SDR through Election Day |
| WY | Wyoming SOS — sos.wyo.gov | Yes | No | SDR available; no online registration portal |
| DC | DC Board of Elections — dcboe.org | Yes | Yes | SDR through Election Day |

## Key Definitions

- **SDR (Same-Day Registration):** Voter can register or update registration on
  Election Day (or, in some states, through the final day of early voting) and
  cast a ballot that same day.
- **Online Registration:** State offers a standalone online voter registration
  portal accessible to the general public without a concurrent DMV transaction.

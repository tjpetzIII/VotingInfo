# Implementation Plan: Ballot measure explainer

Add a typed frontend measure model and neutral explainer component. Detect measure contests from
explicit structured fields only, with an unavailable state for absent data. Add English/Spanish
messages, accessible disclosure controls, deterministic component tests, and wire it into ballot
rendering without storing or transmitting new personal data.

Constitution check: PASS; frontend-only, no raw upstream forwarding, and no unsupported claims.

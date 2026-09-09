# VOT-72 Spanish localization completion

## User Story 1 (P1)
As a Spanish-speaking voter, I can use every core route with localized app-authored text, dates, errors, labels, and accessible names while my address and election selection persist.

## Requirements
- FR-001 Audit and localize app-authored route/component copy in both English and Spanish catalogs.
- FR-002 Format dates and errors using the selected react-intl locale and stable localized error keys.
- FR-003 Persist locale safely, update document language, and preserve address/election state during switching.
- FR-004 Keep upstream names, addresses, and official prose unchanged; add deterministic bilingual tests and review checklist.

## Acceptance
Spanish locale with an en-US browser renders Spanish dates and polling states; corrupt or denied storage does not crash; switching locale updates document language without refetching.

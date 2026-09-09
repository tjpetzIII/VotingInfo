# Implementation Plan: VOT-72

Use the existing `react-intl` provider and message maps. Harden `LocaleContext` storage and document language synchronization, inject `intl` into date/polling components, and map shared API not-found errors through message IDs at consumer boundaries. Preserve API supplied prose and shared Address/Election contexts. Add focused tests for locale persistence, document language, date formatting, and bilingual polling states.

Touch points: `frontend/src/contexts/LocaleContext.tsx`, `frontend/src/app/layout.tsx`, `frontend/src/app/voter-info/page.tsx`, `frontend/src/app/dates/page.tsx`, polling components, `frontend/src/messages/{en,es}.ts`, and tests/docs.

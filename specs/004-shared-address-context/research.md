# Phase 0 Research: Single Shared Address Entry

All items below were resolved from the existing codebase (`LocaleContext`, `AddressForm`, the 7 target pages, `CLAUDE.md`) rather than requiring external research — this is a small, self-contained frontend feature with a directly analogous existing pattern to follow. No `NEEDS CLARIFICATION` markers remain.

## 1. Provider pattern

**Decision**: Add `AddressContext.tsx` under `frontend/src/contexts/`, structured identically to `LocaleContext.tsx`: `createContext` with a default value, a `Provider` component that holds state via `useState`, hydrates from `localStorage` in a mount-only `useEffect` (SSR-safe — `window`/`localStorage` are never touched during render), and a `useAddress()` hook.

**Rationale**: `LocaleContext` is the established, working pattern in this codebase for exactly this shape of problem (small piece of user preference/state, persisted to `localStorage`, shared app-wide via `Providers.tsx`). Reusing it keeps the change idiomatic and low-risk, and reviewers already know how to reason about it.

**Alternatives considered**:
- *URL-only state (no context)* — rejected; the spec explicitly requires persistence across a full reload/new session (FR-005), which a per-navigation URL param does not provide on its own, and the ticket explicitly scopes URL-based sharing to a separate ticket (VOT-25).
- *A dedicated state library (Zustand/Redux)* — rejected as unjustified complexity; the app has no existing global state library, and one preference value doesn't warrant introducing one (Principle III: no speculative abstractions).

## 2. Where the provider is wired

**Decision**: Add `AddressProvider` into `Providers.tsx` in the same tier as `LocaleProvider` (outermost, alongside/before `IntlWrapper`), since address, like locale, has no dependency on `QueryClientProvider` or `AuthProvider` and pages need it available regardless of auth state.

**Rationale**: Matches the ticket's proposed approach and keeps the provider nesting order intuitive: preference-like contexts (Locale, Address) wrap request/auth-related ones.

**Alternatives considered**: Nesting it inside `AuthProvider` — rejected; the address is not user-account-scoped (this repo's auth has no concept of per-user address storage), so there's no reason to gate it behind auth.

## 3. Storage shape: structured fields vs. a single formatted string

**Decision**: Store structured fields (`street`, `city`, `state`, `zip`) in `localStorage` under key `address`, not a single pre-joined string. Derive the API-ready formatted string (`"${street}, ${city}, ${state} ${zip}"`, matching the existing format used in `AddressForm.handleClick`) on demand when calling `fetch*` functions.

**Rationale**: The ticket's own acceptance criteria (via this feature's FR-008) require the "Change" control to reopen `AddressForm` **pre-filled with the previous values** — i.e., four separate inputs. `AddressForm` has no free-text combined field; splitting a previously-joined string like `"123 Main St, Apt 4, Springfield, IL 62704"` back into components is ambiguous (street addresses can themselves contain commas), so storing structured fields is strictly safer and is a natural drop-in for `AddressForm`'s existing `useState` fields. The ticket's "Proposed approach" section suggested a plain string, but that section is explicitly non-binding ("Proposed approach", not "Requirements"); the binding acceptance criteria are what this decision satisfies.

**Alternatives considered**:
- *Single formatted string + regex/split parsing for pre-fill* — rejected; fragile for addresses containing commas or multi-word cities, and adds parsing logic with no corresponding value.
- *Store both the structured fields and the formatted string* — rejected as redundant; the formatted string is cheap to derive on every read and keeping two representations in sync is an unnecessary source of bugs.

## 4. Interaction with the existing `?address=` URL parameter on `elections` and `ballot`

**Decision**: On `elections/page.tsx` and `ballot/page.tsx`, if the `?address=` URL query param is present on load, it continues to take precedence for that page load (preserves the existing, unrelated shareable-link behavior). If absent, the page falls back to the shared saved address (if any). In both cases, submitting the form updates the shared context so other pages pick it up.

**Rationale**: The URL-param behavior on these two pages predates this ticket and is explicitly out of scope to build out further (VOT-25 covers deep-linkable address URLs generally), but it already exists and must not regress. Treating the URL param as a same-page override rather than removing or replacing it is the minimal-blast-radius choice, and is consistent with VOT-25's note in the spec that URL-based sharing "could later read from this shared context as an additional address source" — i.e., URL param and shared context are meant to coexist, URL taking precedence when explicitly provided.

**Alternatives considered**: Always prefer the shared context over the URL param — rejected; this would break existing "copy shareable link" behavior on the `elections` page (`handleShare`), silently overriding a link recipient's intended address with whatever they happen to have saved locally.

## 5. Detail pages with no `AddressForm` today (`elections/[contestId]`, `ballot/[contestId]`)

**Decision**: These two pages currently source `address` exclusively from the URL query param and render a "no address" fallback state when it's absent (see `contest.noAddress` message in `elections/[contestId]/page.tsx`). Extend both so that when the URL param is absent, they fall back to the shared saved address instead of immediately showing the "no address" state; they also gain the shared `AddressSummary` control (FR-003) so the address in use is visible and changeable without navigating back to the parent list page.

**Rationale**: The spec explicitly lists both pages among the seven address-driven pages requiring this behavior (FR-001, FR-003). Falling back to context rather than adding a full second `AddressForm` keeps these detail pages focused (they're a drill-down from `elections`/`ballot`), while still meeting "every address-driven page exposes a visible change control" (FR-003) via the shared `AddressSummary` component, whose change action can update the context and re-navigate.

**Alternatives considered**: Redirect to the parent list page when no URL address is present — rejected; contradicts FR-002 ("page MUST automatically use it... rather than first presenting an empty form/state") when a shared address does in fact exist.

## 6. Shared "Using: {address} · Change" UI

**Decision**: Extract a small shared component, `AddressSummary`, used by all seven pages, that (a) renders the currently-in-use address plus a "Change" affordance, and (b) toggles into showing `AddressForm` pre-filled with the saved structured fields when "Change" is activated, calling back into the shared context's setter on submit.

**Rationale**: FR-003 requires this control on every address-driven page; extracting one component avoids seven near-duplicate implementations (Principle III — avoid unnecessary duplication) while each page still controls its own layout/copy around it.

**Alternatives considered**: Inline the control separately per page — rejected; seven copies of the same toggle-and-prefill logic is the kind of duplication Principle III explicitly discourages, and would be seven places to independently get FR-008 (pre-fill) right or wrong.

## 7. SSR-safety / hydration

**Decision**: Follow `LocaleContext`'s exact approach — initial state is a safe default (`null`, meaning "no saved address"), and the real value is read from `localStorage` inside a `useEffect` that runs once after mount. Pages that need to "auto-fetch" on a saved address gate their data-fetching (`enabled: !!address` in react-query, matching the existing convention in `elections`/`ballot`) so they naturally wait one tick for hydration rather than fetching with a stale/default value during SSR.

**Rationale**: This is the same technique already proven not to cause hydration mismatches for `locale` in this codebase; no new SSR risk is introduced.

**Alternatives considered**: Reading `localStorage` synchronously during initial `useState` — rejected; this is exactly the class of hydration-mismatch bug the existing `LocaleContext` comment/structure was written to avoid (server render always sees no `window`).

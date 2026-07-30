# Phase 1 Data Model: Single Shared Address Entry

## Entity: Saved Address

The single most-recently-entered address, shared across all address-driven pages. At most one instance exists at any time; entering a new address replaces it entirely (FR-006).

| Field | Type | Validation | Notes |
|---|---|---|---|
| `street` | `string` | non-empty after trim | Same rule as `AddressForm`'s existing street validation |
| `city` | `string` | non-empty after trim | Same rule as `AddressForm`'s existing city validation |
| `state` | `string` | exactly 2 letters, uppercased | Same rule as `AddressForm`'s existing state validation (`/^[A-Z]+$/`, length 2) |
| `zip` | `string` | exactly 5 digits | Same rule as `AddressForm`'s existing zip validation (`/^\d{5}$/`) |

**Validation ownership**: Validation rules are not duplicated in the context — they remain owned by `AddressForm` (FR-007: existing validation is unchanged). The context only ever receives an already-validated `Saved Address` from a successful form submission; it does not re-validate.

**Derived value**: `formattedAddress = "${street}, ${city}, ${state} ${zip}"` — computed on demand wherever a page needs the single string the backend API expects (matches the existing format documented in `CLAUDE.md`: *"Google's Civic API requires a full street address"*). Not stored separately (see `research.md` §3).

**Absence state**: `null` — no address has ever been saved, or previously saved data could not be read/parsed (FR-009). Pages MUST treat `null` identically to "first visit."

**Persistence**: Serialized as JSON under `localStorage` key `address` (analogous to the existing `locale` key used by `LocaleContext`). Read once on mount via `useEffect`; written on every successful `setAddress` call. If `JSON.parse` fails or the parsed shape doesn't match (missing/wrong-typed fields), the context falls back to `null` rather than throwing.

## State Transitions

```
        (no localStorage entry, or unparsable entry)
                        │
                        ▼
                  ┌───────────┐
        ┌────────▶│   null    │◀────────┐
        │         └─────┬─────┘         │
        │               │ setAddress(   │
        │               │   validSaved  │
        │               │   Address)    │
   clearAddress()        ▼               │
        │        ┌───────────────┐      │
        └────────│ SavedAddress   │──────┘
                  │ (street, city, │  setAddress(newValidSavedAddress)
                  │  state, zip)   │  → replaces in place, same state
                  └───────────────┘
```

- There is no history/list state — a new `setAddress` call always replaces the current value, it never appends (FR-006).
- `clearAddress()` (available on the context, mirroring the ticket's proposed API shape) returns the state to `null`; no page in scope for this feature exposes a dedicated "clear" UI action beyond the "Change" flow, but the capability exists on the context for consistency with `LocaleContext`-style provider APIs and to keep `AddressSummary`'s "Change" control simple (it can always route through `setAddress`).

## Relationships

- **Saved Address → the 7 address-driven pages**: one-to-many, read-only consumption. No page owns its own copy of the address once this feature ships — each reads `useAddress()` and, on submit, calls the shared `setAddress`.
- **Saved Address → `AddressForm`**: `AddressForm` gains an optional pre-fill prop shaped like `Saved Address` (or `null`); it does not read the context directly, keeping it a controlled/presentational component as it is today.

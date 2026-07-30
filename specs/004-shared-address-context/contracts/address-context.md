# Contract: `AddressContext` / `useAddress()`

This is an internal frontend interface contract — there is no external network API for this feature (no backend changes). It is documented as a contract because seven pages plus shared UI components (`AddressForm`, `AddressSummary`) all depend on this shape, so it is the feature's de facto public interface within the frontend codebase.

## Types

```ts
interface SavedAddress {
  street: string;
  city: string;
  state: string;   // 2-letter, uppercased
  zip: string;      // 5 digits
}

interface AddressContextValue {
  address: SavedAddress | null;
  setAddress: (address: SavedAddress) => void;
  clearAddress: () => void;
}
```

## `useAddress(): AddressContextValue`

### Guarantees

1. **Consistent snapshot**: every consumer reading `useAddress()` at the same point in the render tree sees the same `address` value — there is exactly one source of truth (no per-page copies).
2. **SSR-safe default**: on first client render (and during any server render), `address` is `null`. The real persisted value (if any) becomes available after mount, at which point consumers re-render with the hydrated value. Consumers that gate a fetch on `address` (e.g. `enabled: !!address` in a `useQuery`) naturally wait for this hydration rather than firing with a stale default.
3. **Single-value invariant**: `setAddress` always replaces the current value in full; there is no way to retain more than one `SavedAddress` at a time (FR-006). Partial updates are not supported — callers must pass a complete, already-validated `SavedAddress`.
4. **No re-validation**: `setAddress` does not validate its input. Callers (in practice, only `AddressForm`'s submit handler) are responsible for validating before calling it. This preserves FR-007 (existing validation UX is unchanged) by keeping validation logic in exactly one place.
5. **Persistence side effect**: a successful `setAddress` call synchronously updates in-memory state and asynchronously/best-effort persists to `localStorage`. If persistence fails (storage disabled/full), the in-memory value still updates for the current session — the feature degrades to non-persisted behavior rather than failing the update (per spec Edge Cases: "browser cannot persist data").
6. **Idempotent clear**: `clearAddress()` sets `address` back to `null` and removes the persisted entry; calling it when already `null` is a no-op with no error.
7. **No implicit fetching**: the context itself performs no data fetching and has no knowledge of `voter-info`/`elections`/`ballot`/etc. — it only holds and persists the address value. Each page remains responsible for its own `useQuery`/`fetch` call keyed off `address`, exactly as pages do today for their local `address` state.

### Non-goals (explicitly out of contract)

- Cross-tab live sync (a `storage` event listener) — not required; see spec Edge Cases (multi-tab is read-on-load only).
- Address history / multiple saved addresses — not supported (FR-006).
- URL query-param handling — remains each page's own concern (see `research.md` §4); the context is one of possibly several address sources a page may consult, not the only one.

## Consumers

| Consumer | Usage |
|---|---|
| `AddressForm` | Does **not** call `useAddress()` directly. Receives an optional pre-fill prop (shaped like `SavedAddress \| null`) from its parent page/`AddressSummary`, and calls its existing `onSubmit(formattedAddressString)` callback — unchanged contract. |
| `AddressSummary` (new shared component) | Calls `useAddress()` to read the current value for display, and calls `setAddress` after a successful `AddressForm` submission from within its own "Change" flow. |
| `voter-info`, `elections`, `elections/[contestId]`, `ballot`, `ballot/[contestId]`, `polling`, `dates` pages | Call `useAddress()` to read `address`; derive the formatted string for their existing `fetch*` calls when `address` is non-null; render `AddressSummary` for the visible/changeable indicator (FR-003). |

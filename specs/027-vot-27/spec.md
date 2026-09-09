# Feature Specification: Invite a friend

Provide a bilingual invite flow with an address-free link by default. Users explicitly choose whether to include address context. Use Web Share where available and clipboard fallback otherwise.

## Success Criteria

- Default links contain no address; opt-in links encode it safely.
- Accessible mobile UI and deterministic share-helper tests cover Web Share and clipboard paths.

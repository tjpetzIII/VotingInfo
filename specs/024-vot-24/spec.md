# Feature Specification: Shareable polling place card

Provide mobile-friendly polling cards with an address-free share link by default. Users may explicitly include their address, with localized copy and safe HTTPS URLs.

The share surface also exposes a deterministic server-rendered OpenGraph image endpoint at `/api/og/polling`; its card omits address data unless `includeAddress=1` is explicitly requested. Polling page metadata points to this endpoint.

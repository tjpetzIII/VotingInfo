---
tags: [voteready, agent-task]
issue: VOT-24
status: in-progress
---
# VOT-24: Shareable polling place card

Added a mobile-friendly polling card share action. Shared URLs omit the address by default; users must explicitly opt in via a checkbox. Existing `buildShareUrl` safely encodes optional address parameters.

Added deterministic dependency-free `/api/og/polling` SVG image response. It escapes user-provided name/address text and includes address only with `includeAddress=1`. Added a server page shell exporting generic OpenGraph metadata without address leakage.

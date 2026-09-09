---
tags: [voteready, agent-task]
issue: VOT-25
status: reviewed-integrated
---
# VOT-25: Privacy-aware address deep links

Audited integrated VOT-69 behavior. Existing App Router pages decode address query values only for
anonymous lookup; address state defaults to session storage. Centralized `buildShareUrl` removes
address by default and adds it only after the explicit include-address control. Existing contest and
polling links preserve identity while avoiding unrelated query parameters. Clipboard failures retain
manual-copy fallbacks with bilingual labels.
The dates and polling pages now hydrate `?address=` links, use the shared session-only address state,
and push safely encoded addresses after form submission.
Their forms also prefill from the decoded URL address, falling back to the shared session address.

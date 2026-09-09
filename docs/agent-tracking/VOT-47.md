---
tags: [voteready, agent-task]
issue: VOT-47
status: reviewed-integrated
---
# VOT-47: React Intl major upgrade

The integrated frontend already resolves react-intl 10.1.18 (declared `^10.1.18`), so no code or lock change was necessary. Existing provider/message usage is compatible and is covered by the frontend lint, type, test, and build gates run on the integration line.

---
tags: [voteready, agent-task]
issue: VOT-31
status: complete
---
# VOT-31: reproducible CI and backend image

Added locked backend/frontend CI gates, explicit TypeScript checking, and a pinned Rust multi-stage backend image. The workflow omits the repository-wide fmt gate because the current baseline has unrelated formatting drift; compile, test, lint, type-check, and build gates remain blocking. CI uses only `NEXT_PUBLIC_API_URL`; secrets remain runtime configuration. Verify image size with `docker image inspect backend --format '{{.Size}}'` after a local build. Registry-backed builds were not run in the restricted environment.

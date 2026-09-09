# Research: VOT-33

Verified 2026-09-09 against official GitHub-reviewed advisories and upstream release information:

- [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93): XSS advisory affects versions below 8.5.10; patched 8.5.10.
- [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q): sourceMappingURL file-read advisory affects versions through 8.5.11; patched 8.5.12.
- [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849): previous-map path traversal affects versions through 8.5.17; patched 8.5.18.
- [Upstream 8.5.18 release](https://github.com/postcss/postcss/releases/tag/8.5.18).

## Decision

Require `^8.5.18` directly, keep the existing identical global override and locked 8.5.25 version.

## Rationale

The ticket accurately identifies the advisory patch floors but its description of the current lock is stale: the checkout already consolidates Next's `8.4.31`, Tailwind's `^8.5.16`, and other consumers into 8.5.25. The remaining direct minimum `^8` is too broad if the override is removed or tooling ignores it. Existing lock integrity and installed dependency resolution will be checked rather than replacing a newer patched lock with the minimum version.

## Alternatives considered

- Only retaining the override leaves the explicitly requested direct minimum unmet.
- Broadly upgrading all frontend packages is unrelated to this ticket and makes compatibility failures harder to attribute.
- Pinning 8.5.18 would unnecessarily downgrade the already locked patched version.

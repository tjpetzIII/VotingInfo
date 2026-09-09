# Data Model: Dependency Audit Record

The audit has no runtime data model. Its documentation records:

- **Package**: crate name, exact resolved version, target, and inverse dependency path.
- **Logging setup**: environment filter fallback, formatter layer, and emitted request fields.
- **Validation result**: command, offline/network mode, outcome, and date.
- **Re-evaluation trigger**: manifest, feature, target, or advisory change requiring a new snapshot.

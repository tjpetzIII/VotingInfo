# Data Model: Native Dependency Audit Evidence

## Dependency evidence record

- **Scope**: backend manifest, lockfile resolution, selected Cargo target/features
- **Fields**: audit date, commands, target scope, observed output, conclusion, invalidating changes
- **Relationships**: one record covers the `quinn`/`quinn-proto` chain and the `anyhow`/`wit-bindgen` chain
- **Validation**: every conclusion must be tied to a command or explicitly labeled lockfile edge tracing; target scope and future triggers are required

No application entities, schema, or API contracts are introduced.

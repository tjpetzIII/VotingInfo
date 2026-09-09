# Research: Native Dependency Audit Evidence

## Decision: Use Cargo's target-aware graph as the primary evidence

Run `cargo tree` from `backend/` with the shared target directory and explicit target scope. Use inverse dependency queries for `quinn` and `quinn-proto`, plus target-specific queries for the WASI chain. Record both successful paths and Cargo's explicit empty-graph result.

**Rationale**: `Cargo.lock` records resolution, including optional and target-specific packages. Cargo's feature and target resolver determines what the native backend can compile, so a lockfile-only advisory result cannot establish runtime reachability.

**Alternatives considered**: `cargo audit` alone was rejected because it scans resolved packages and does not by itself prove a package is in the native build graph. Manual lockfile edge tracing is retained as corroborating evidence for the `getrandom` WASI chain.

## Decision: Treat feature and target changes as audit invalidators

Re-run both advisory checks if `reqwest` enables `http3`, if a native path to QUIC is otherwise introduced, or if the backend adds a `wasm32-wasip*` build/release target or target-specific feature set.

**Rationale**: These changes alter the reachability assumptions that make the current conclusions valid.

## Decision: Keep the change documentation-only

Add a root `docs/` audit note and feature artifacts; do not change manifests, source, migrations, or CI behavior.

**Rationale**: The ticket asks for applicability evidence and future triggers, and no runtime remediation is justified while the chains are inactive for native features.

# VOT-38 Spec: Patch crossbeam-epoch

Update the transitive `crossbeam-epoch` dependency to a patched version without changing application behavior. The backend must continue to compile and its cache behavior must remain unchanged.

## Acceptance

- Cargo.lock resolves `crossbeam-epoch >= 0.9.20`.
- `cargo check`, tests, clippy, and formatting remain green.
- The dependency path and validation evidence are documented.

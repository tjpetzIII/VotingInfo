# Quickstart: Native Dependency Audit Evidence

From the repository root, run the commands in the order below. They use the shared backend target directory and do not require a service, API key, or live network.

```sh
cd backend
export CARGO_TARGET_DIR=/Users/tpetz/Code/AI/votingApp/backend/target
cargo tree -i quinn --target all
cargo tree -i quinn-proto --target all
cargo tree -i anyhow --target x86_64-apple-darwin
cargo tree -i wit-bindgen --target x86_64-apple-darwin
cargo check
cargo build
```

Compare the graph results and build results with [`docs/dependency-audits.md`](../../docs/dependency-audits.md). If `reqwest` gains `http3`, or the backend begins building for `wasm32-wasip*`, repeat the audit with the changed feature/target set before treating the existing conclusions as valid.

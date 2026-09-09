# Dependency audit evidence

## VOT-40 native backend snapshot (2026-09-09)

This note records applicability for the native `backend` checkout at review time. It is evidence about the current manifest and target selection, not a blanket statement that the advisories are harmless for every Cargo target or future configuration.

### `quinn` / `quinn-proto`

`backend/Cargo.toml` declares `reqwest = { version = "0.13", default-features = false, features = ["json", "rustls", "query"] }`; `http3` is not enabled. The resolved `reqwest` package in `backend/Cargo.lock` lists `quinn` as a resolution edge, and `quinn` lists `quinn-proto`, so the packages can appear in the lockfile without being in the selected native graph.

Exact checks from `backend/` (with `CARGO_TARGET_DIR=/Users/tpetz/Code/AI/votingApp/backend/target`):

```text
$ cargo tree -i quinn --target all
warning: nothing to print.

$ cargo tree -i quinn-proto --target all
warning: nothing to print.
```

The same inverse queries with `--target x86_64-apple-darwin` also report `warning: nothing to print.` The feature graph (`cargo tree --target all -e features`) shows the selected `reqwest` features `json`, `query`, and `rustls`, with no `http3` feature path. Therefore there is no selected native backend path to `quinn` or `quinn-proto` in this snapshot. The QUIC advisories (GHSA-4w2j-m93h-cj5j, RUSTSEC-2026-0037, and RUSTSEC-2026-0185) require re-evaluation if `reqwest` `http3` is enabled or another native dependency path introduces QUIC.

### `anyhow` / `wit-bindgen` / `wit-component`

The lockfile resolves `getrandom` 0.3.4 and 0.4.2 with `wasip2`/`wasip3` edges. Those resolve to `wit-bindgen` 0.51.0; its Rust macro/core/component packages include `anyhow`. A target-all feature graph shows the lockfile edges through `moka → uuid → getrandom → wasip2/wasip3 → wit-bindgen`, as well as other dependency paths. These are target-specific WASI edges, not evidence that the native backend compiles the WASI toolchain.

Exact native checks from `backend/`:

```text
$ cargo tree -i anyhow --target x86_64-apple-darwin
warning: nothing to print.

$ cargo tree -i wit-bindgen --target x86_64-apple-darwin
warning: nothing to print.
```

For comparison, `cargo tree -i wit-bindgen --target all` prints the `wasip2` and `wasip3` paths, including backend paths through `moka → uuid → getrandom`. This is expected when asking Cargo to include every target and does not mean a native build compiles WASI. `cargo check --offline` and `cargo build --offline` both completed successfully for the native backend in this snapshot. The `anyhow` advisory (RUSTSEC-2026-0190) requires re-evaluation if a `wasm32-wasip*` target or target-specific feature/build is introduced.

### Re-evaluation triggers

Repeat this audit whenever any of the following changes:

- `reqwest` enables `http3`, or another selected native feature/dependency introduces `quinn`.
- The backend adds a `wasm32-wasip*` build, release, CI, or target-specific feature configuration.
- Cargo, `reqwest`, `getrandom`, `moka`, `uuid`, `wit-bindgen`, or related resolver behavior changes enough to alter the selected graph.
- A future `cargo audit` report identifies a version or advisory change affecting these packages.

`cargo audit` output alone must not be treated as native reachability evidence; pair it with target/feature-aware `cargo tree` output and a successful native build/check.

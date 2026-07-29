# TLS chain fix for sites that don't send intermediates

## The problem

Some state voting sites (e.g. `www.sos.alabama.gov`) send **only the leaf certificate** in the TLS handshake and rely on AIA (Authority Information Access) fetching to let clients download the intermediate themselves. Browsers and `curl` on macOS do AIA chasing transparently. **Rustls does not.** The backend uses `reqwest` with the `rustls-tls` feature, so a naive scraper will fail with:

```
Scraper failed to parse page: fetch failed: error sending request for url (https://...)
  | caused by: client error (Connect)
  | caused by: invalid peer certificate: UnknownIssuer
```

You will only see the `UnknownIssuer` line if you unwrap the reqwest error source chain — see the "Always unwrap errors" rule in `SKILL.md`.

## How to detect it

Before writing code, run:

```bash
echo | openssl s_client -connect <host>:443 -servername <host> -showcerts 2>/dev/null \
  | grep -c 'BEGIN CERTIFICATE'
```

- `2` or more → server sends the chain, no fix needed.
- `1` → server sends only the leaf; you need to bundle the intermediate.

## How to fix it

### 1. Get the intermediate URL

```bash
echo | openssl s_client -connect <host>:443 -servername <host> 2>/dev/null \
  | openssl x509 -noout -text \
  | grep -A1 'CA Issuers'
```

Output looks like:
```
CA Issuers - URI:http://secure.globalsign.com/cacert/gsatlasr3ovtlsca2026q1.crt
```

### 2. Download and convert to PEM

```bash
mkdir -p backend/certs
curl -sS <intermediate-url> -o /tmp/intermediate.der
openssl x509 -inform DER -in /tmp/intermediate.der \
  -out backend/certs/<descriptive_name>.pem
```

Name the PEM after the issuer CN, e.g. `globalsign_atlas_r3_ov_tls_ca_2026_q1.pem`.

### 3. Bundle it into the scraper

In `backend/src/services/{state_lower}_scraper.rs`:

```rust
use reqwest::{Certificate, Client};

/// The {State} SOS server serves only its leaf certificate and relies on AIA
/// fetching for the intermediate, which rustls does not perform. Bundle the
/// intermediate explicitly so the chain validates.
const {STATE}_INTERMEDIATE_PEM: &[u8] = include_bytes!(
    "../../certs/<descriptive_name>.pem"
);

fn build_client() -> Result<Client, AppError> {
    let cert = Certificate::from_pem({STATE}_INTERMEDIATE_PEM)
        .map_err(|e| AppError::ScraperError(format!("load {State} intermediate cert: {e}")))?;
    Client::builder()
        .add_root_certificate(cert)
        .build()
        .map_err(|e| AppError::ScraperError(format!("build {State} client: {e}")))
}

/// The `_client` parameter is ignored; we build a dedicated client that
/// trusts the bundled intermediate.
pub async fn scrape(_client: &Client) -> Result<Scraped{State}Data, AppError> {
    let client = build_client()?;
    let html = client.get({STATE}_ELECTIONS_URL)
        .header("User-Agent", "Mozilla/5.0 (compatible; VoteReadyBot/1.0; +https://voteready.app)")
        .send().await.map_err(|e| {
            let mut msg = format!("fetch failed: {e}");
            let mut src: Option<&dyn std::error::Error> = std::error::Error::source(&e);
            while let Some(s) = src {
                msg.push_str(&format!(" | caused by: {s}"));
                src = s.source();
            }
            AppError::ScraperError(msg)
        })?
        .text().await
        .map_err(|e| AppError::ScraperError(format!("read body failed: {e}")))?;
    // ... parse
}
```

### 4. Update the Dockerfile if needed

The existing `backend/Dockerfile` uses `COPY . .` inside the builder stage, so `backend/certs/*.pem` files are automatically picked up by `include_bytes!` at compile time. No Dockerfile changes are needed. **But** remember to rebuild the image (`docker compose up -d --build backend`) after adding a new cert — the running container still has the old binary.

## Why not just disable cert verification?

Never use `danger_accept_invalid_certs(true)`. Bundling the intermediate keeps real MITM protection while fixing the one misconfigured server. The intermediate has its own validity window (check "Not After" with `openssl x509 -noout -dates -in ...pem`) — note it in a comment and renew when it expires.

## Reference

This was first needed for Alabama: `backend/src/services/al_scraper.rs` + `backend/certs/globalsign_atlas_r3_ov_tls_ca_2026_q1.pem`.

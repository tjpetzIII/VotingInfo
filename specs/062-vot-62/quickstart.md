# Validation
Run backend cargo test, cargo clippy -- -D warnings, cargo fmt --check; frontend yarn test, yarn lint, npx tsc --noEmit, yarn build independently.
Mock Civic voterinfo with primary and general choices, then same-day choices. Assert discovery only queries voterinfo, explicit electionId forwarding, isolated two-election cache results, no fallback on errors, and selected-date mismatch omits scraped deadlines.
Frontend render with QueryClient/AddressProvider/ElectionProvider/IntlProvider and mocked fetchers. Select via native keyboard/select control, change address, navigate with electionId, resolve previous request last. Assert only current election result displayed. Check loading/error/zero/one/multiple choices visually and record screenshot in docs/agent-tracking/VOT-62.md.

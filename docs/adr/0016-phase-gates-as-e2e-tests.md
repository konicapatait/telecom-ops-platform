# ADR-0016: Encode each phase gate as an automated E2E test

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
`apps/shell-e2e` (Playwright) runs the real shell and remotes on mocks. Each phase's gate from the implementation plan becomes a test before the phase is called done. Phase 0–1 tests: the shell renders chrome and persona; `mfe-fraud` loads through the manifest and shares singletons; **a stopped remote (`context.route` abort) shows the fallback, navigation still works, and Retry recovers without a reload**; `?mockFail`; persona switch; not-found inside the chrome.

The same suite runs against local dev servers (default) or any deployed environment (`BASE_URL=https://dev.example.com`). It was verified against a local `dev` deployment produced by the real deploy scripts.

## Consequences
- Use `context.route`, not `page.route`, to fake outages. MSW's service worker re-issues requests, and `page.route` does not see them.

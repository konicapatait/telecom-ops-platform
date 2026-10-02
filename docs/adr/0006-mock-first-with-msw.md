# ADR-0006: Deliver mock-first with MSW, and make sure mocks can never reach production

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Plan decision 6, "Mock data strategy"

## Context
No team should wait for a backend. The same app code must run against mocks locally and against real APIs in higher environments.

## Decision
- **Mock Service Worker** intercepts HTTP at the network layer. App code calls real paths (`/api/...`). Handlers use origin-agnostic patterns (`api('/cases')` → `*/api/cases`), so the same handlers run in the browser (shell or a remote's harness) and in Vitest (`libs/mocks/src/node.ts`).
- **Fixtures** live in `libs/mocks` and are typed against `@platform/contracts`, so a contract change breaks the mock build first. Hero ids (`FRD-2026-000142`, `BIL-2026-003318`, `PTR-2026-000057`) are fixed. Bulk rows come from a seeded generator, `generateCases({ seed: 42 })`.
- **Personas** (Analyst, Supervisor, Auditor) come from `MockAuthService` in `@platform/auth-mock`. The persona travels as the bearer token `mock.<id>`, and the mock `/api/me/entitlements` derives entitlements from it, just as the real backend will.
- **URL flags:** `?mockDelay=800` adds latency, `?mockFail=mfe-fraud` fails a remote, and `?mockFail=/api/cases` fails an API path.

**The production firewall has four independent layers:**
1. `src/start-mocks.ts` is the only file that imports `@platform/mocks` or `@platform/auth-mock`. The `production` configuration replaces it with `start-mocks.prod.ts` (`fileReplacements`).
2. ESLint `no-restricted-imports` forbids `@platform/mocks` and `msw` everywhere except `start-mocks.ts`, specs and `libs/mocks`.
3. Mock auth is a **separate, unshared** entry point (`@platform/auth-mock`). Shared mappings are bundled whole (federation cannot tree-shake across the boundary), so keeping `MockAuthService` inside `@platform/auth` put it in every production bundle. CI caught that during Phase 0.
4. `tools/scripts/check-no-mocks-in-prod.mjs` scans every production build for the MSW worker, MSW runtime strings, hero fixture ids and mock tokens. It runs in every `.app-build` CI job.

## Consequences
- Three build configurations: `development` (local), `mock` (optimised, deployed to **dev** and used by CI E2E), `production` (staging and prod).
- Mocks drift from real APIs over time. In Phase 6, type fixtures from the OpenAPI spec and add contract tests, then switch handlers to `passthrough()` one endpoint at a time.
- Browsers without service-worker support (for example some embedded webviews) cannot run mock mode. `startMockWorker` logs a clear error and the app still boots.

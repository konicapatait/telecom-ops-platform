# ADR-0019: Entitlements are enforced by the API; the UI only hides and explains

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
- The UI uses entitlements to **hide** things: nav entries, case tabs (`CaseTabDefinition.entitlement`), the resolution rail and controls (`*hasEntitlement`, for example Upload). That is a convenience, **not** security.
- Every protected endpoint checks the caller's entitlements and answers **403**. The mocks do exactly this (`libs/mocks/src/lib/http-errors.ts`, persona from the bearer token), so the frontend is built against realistic behaviour.
- Capabilities render a 403 as an explicit "No access to …" state, never as a generic error.
- Downloads go through `HttpClient` (so the auth interceptor attaches the token), not a bare `<a href>`.
- Audit events are written **server-side** as a side effect of actions. There is no write endpoint for the UI (plan: "the audit tab is read-only by design").

## Consequences
- The backend team gets a precise contract: the endpoint → entitlement table in `docs/guides/mocks-and-personas.md`.

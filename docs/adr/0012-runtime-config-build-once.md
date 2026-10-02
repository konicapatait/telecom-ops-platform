# ADR-0012: Environment-specific values are runtime config; the build has only three flavours

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
- **Build-time** (`environment*.ts` + `fileReplacements`) decides only *whether mocks exist*: `development`, `mock` and `production`.
- **Runtime** values that differ per environment (Okta issuer and client id, log endpoint, environment name) live in **`/app-config.json`**, loaded by the shell before bootstrap (`core/runtime-config.ts`). The deploy job uploads `apps/shell/config/<env>/app-config.json`.
- The remote manifest is runtime config as well (ADR-0007).

## Consequences
- The artifact tested in staging is byte-for-byte the one that goes to production.
- `apps/shell/config/*/app-config.json` contains placeholders (`REPLACE_WITH_SPA_CLIENT_ID`) that must be filled before the first real-auth environment. The Okta client id is public (SPA + PKCE). No secrets belong in this file.

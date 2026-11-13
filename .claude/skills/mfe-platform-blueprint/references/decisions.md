# Seed decision register

Copy this into `docs/platform-handbook.md` of the new shell repo as section "Decision register". The code templates in these skills cite these ids. Edit the wording to your context, then keep the ids stable forever.

## How to record a decision
1. Add a row to the table with the next free id (ADR-0021, …).
2. Add an `### ADR-00NN` entry: the decision in one bold line, then 3–6 bullets: what we do, how it is enforced, what was rejected and why.
3. If it changes an earlier decision, fill "Amended by" on the old row and say in the new entry what changed. Never renumber or delete an entry.
4. Cite the id in code comments where the rule applies: `(ADR-00NN)`.

## Register

| ID | Decision | Enforced by | Amended by |
| --- | --- | --- | --- |
| ADR-0001 | Design system is an external, exact-pinned package, a runtime singleton, never a remote | `shared.config.js`, `check-shared-config` | – |
| ADR-0002 | Shell owns only the chrome; layouts belong to families (build-time libs, not shared, not remotes) | lint tags | – |
| ADR-0003 | Remote kinds: domain (`./Routes`), capability (one component), hub | generator | – |
| ADR-0004 | Contracts lib: no dependencies, additive changes only, versioned event names | lint tags, CODEOWNERS | – |
| ADR-0005 | Mock-first with MSW; four-layer production firewall | `fileReplacements`, ESLint, `check-no-mocks` | – |
| ADR-0006 | Runtime manifest per environment; per-section fallback and Retry | `main.ts`, `remote-routes.ts`, E2E | – |
| ADR-0007 | One shared federation config; `ignoreUnusedDeps: false` | `check-shared-config` | – |
| ADR-0008 | GitLab per-app pipelines; affected child pipeline; build once, promote; deploy and roll back by manifest | `.gitlab-ci.yml`, `tools/ci/*` | – |
| ADR-0009 | Toolchain pins (exact), upgraded together | `package.json`, `.nvmrc`, `engines` | – |
| ADR-0010 | Runtime `app-config.json`; three build flavours (development, mock, production) | `runtime-config.ts`, deploy script | – |
| ADR-0011 | Abstract `AuthService`; Okta or mock by DI override | `provideAuth`, `provideMockAuth` | – |
| ADR-0012 | Module boundaries by Nx tags, as lint errors | `eslint.config.mjs` | – |
| ADR-0013 | Apps are created only by the generator | review, CODEOWNERS | – |
| ADR-0014 | Phase gates are E2E tests | `apps/shell-e2e` | – |
| ADR-0015 | Entitlements are enforced by the API; the UI hides and explains | API, mocks | – |
| ADR-0016 | Structured logging, traced remote loads, `platformDiagnostics()` | utils / mf-manifest specs | – |
| ADR-0017 | Cross-section navigation belongs to the shell (events) | review | – |
| ADR-0018 | Legacy app runs as an isolated remote behind a mount contract | contract smoke | – |
| ADR-0019 | Hosting: private S3 + CloudFront, one domain per environment, `/api` same origin | infra review | – |
| ADR-0020 | Deploy with GitLab OIDC roles per app; conditional manifest writes | IAM, deploy script | – |

### ADR-0001
**Design system: external package, exact pin, runtime singleton, never a remote.**
- One exact version for every app, shared as `singleton + strictVersion`. Two copies mean two overlay containers and focus traps fighting each other.
- Only the shell loads global `tokens.css` / `reset.css`; remotes ship no global CSS and use `--ds-*` tokens.
- A design-system bump rebuilds every app (Nx cannot see the runtime singleton): the pipeline planner detects it.
- Rejected: design system as a remote (extra fetch, untyped), copied into the monorepo (coupled release cycles), caret ranges (drift, runtime failures).

### ADR-0002
**The shell owns only the chrome; layouts belong to families.**
- Three levels: app chrome (shell) → family layout (build-time lib, e.g. `libs/<family>-layout`) → page content (remotes).
- An app imports `scope:shared` libs plus its own family's layout lib only.
- Family layouts are compiled into each member, deliberately not shared and not remotes: no extra fetch, typed inputs end to end. A layout change rebuilds the family (Nx `affected`).
- Rejected: shell owns all layouts (every section inherits one shape); each app owns its layout (forks).

### ADR-0003
**Three remote kinds.**
- Domain: exposes `./Routes` (default export), mounted by the shell at `/<route>/**`, guarded by its entitlement.
- Capability: exposes exactly one standalone component with a named, typed input contract; fetches its own data; never reads the route.
- Hub: a domain remote whose page hosts other domain remotes as tabs (`canMatch: remoteAvailable(...)` + in-tab fallback).

### ADR-0004
**Contracts are the only API between apps.**
- `libs/contracts`: types, `REMOTE_NAMES`/`RemoteName`, `PlatformEventBus`, context stores with one writer each.
- Depends on nothing (lint). Changes are additive only; payloads never change, a new `.v2` event is added instead. Platform-owner review (CODEOWNERS).

### ADR-0005
**Mock-first with MSW; mocks can never reach production.**
- MSW intercepts real `/api/...` paths with origin-agnostic patterns (`*/api/...`) so handlers run in the browser and in Node tests.
- Personas come from the mock auth package; the persona travels as bearer token `mock.<id>`; mock endpoints answer 403 like the real API.
- URL flags: `?mockDelay=800`, `?mockFail=<remote>`, `?mockFail=/api/<path>`.
- Firewall: (1) only `start-mocks.ts` imports mocks and is file-replaced in production; (2) ESLint `no-restricted-imports`; (3) mock auth is a separate, unshared package; (4) `check-no-mocks-in-prod` scans every production bundle.
- Three build configurations: `development`, `mock` (deployed to dev, used by CI E2E, output `dist/apps-mock`), `production` (`dist/apps`).

### ADR-0006
**Remotes come from a runtime manifest; one failing remote breaks only its own section.**
- `/mf-manifest.json` per environment, served `no-cache`. Boot: fetch (failure → `{}`) → `initFederation` → `import('./bootstrap')`.
- `loadRemote()` always passes `remoteName` and `remoteEntry`, so a remote that was down at boot registers on Retry.
- Routes come from a typed registry kept by the generator; each falls back to `SectionUnavailableComponent`; Retry calls `router.resetConfig(factory())` then navigates again.
- Nav shows a section only if its remote is in the manifest and the user holds its entitlement.

### ADR-0007
**One shared federation config.**
- `libs/mf-manifest/src/shared.config.js` alone declares npm singletons and shared monorepo libs; every app's `federation.config.js` is `withPlatformFederation({ name, exposes })`.
- `ignoreUnusedDeps: false`: otherwise the host omits secondaries it doesn't import (e.g. `@angular/core/rxjs-interop`) and a remote's own copy fails with NG0203.
- Not shared: mocks, mock auth, layout libs. Skipped: test entries, `msw*`, `@okta/okta-auth-js` (lazy-loaded by the shell only).
- `check-shared-config` fails on a local `shared`, a name mismatch, a non-exact pin, or a mapping without a tsconfig path.

### ADR-0008
**GitLab CI: per-app pipelines, build once, promote by manifest.**
- Root pipeline: workspace checks → plan (affected apps, or `APP=<name>`, or all on `FULL_BUILD`/design-system bump) → dynamic child pipeline of each app's `.gitlab-ci.yml` → composed E2E.
- Per app: lint, test, build (production + mock), mock scan, deploy dev (mock build), contract smoke, manual deploy staging, manual deploy prod, manual rollback.
- Deploy uploads an immutable version folder, rewrites one manifest entry, appends release history. Rollback rewrites the entry back.

### ADR-0009
**Toolchain pins.** Node (`.nvmrc` + `engines`), npm 11 (`allowScripts` for approved install scripts), Nx, Angular, Native Federation (same major as Angular), es-module-shims, RxJS, TypeScript, Vitest, Playwright, MSW: all exact. Angular, Native Federation and Nx upgrade together via `nx migrate`.

### ADR-0010
**Runtime config.** Build time decides only whether mocks exist. Per-environment values (Okta issuer and client id, log endpoint, environment name) live in `/app-config.json`, loaded before bootstrap, no secrets. The artifact tested in staging is byte-identical to production.

### ADR-0011
**Abstract AuthService.** MFEs inject only the abstraction (`user`, `isAuthenticated`, `init`, `login`, `logout`, `getAccessToken`). `OktaAuthService` (OIDC + PKCE) lazy-imports the SDK. Mock builds override it with `provideMockAuth(PERSONAS)`. `authInterceptor` adds the token to same-origin `/api` calls only. Entitlements load once from `/api/me/entitlements`.

### ADR-0012
**Module boundaries by Nx tags.** Tags `type:` (app, layout, contracts, shared-lib, mocks, e2e, tooling), `family:`, `kind:`, `scope:shared`. Contracts depend on nothing; shared libs on contracts and shared libs; layouts never on apps; a family app only on shared libs and its own family layout. Selector prefix per project; OnPush required.

### ADR-0013
**Apps only via the generator.** It creates the app, its pipeline file, the `RemoteName` entry, a local manifest port, the shell registration and a CODEOWNERS line. Changing templates does not migrate existing apps.

### ADR-0014
**Phase gates are E2E tests** in `apps/shell-e2e`, against local servers or any deployed environment (`BASE_URL=…`). Use `context.route`, not `page.route`, to fake outages (MSW's service worker re-issues requests).

### ADR-0015
**The API enforces access.** The UI hides nav entries, tabs and controls as a convenience; every protected endpoint answers 403 (mocks too); components render 403 as an explicit "No access" state. Audit events are written server-side.

### ADR-0016
**Logging and diagnostics.** One logger (`createLogger(source)` / `LoggerService`), line format `[platform] HH:MM:SS.mmm LEVEL source message {context}`, a `sessionId` per page; level via `?logLevel=debug`; warn/error shipped to `LOG_ENDPOINT` with `sendBeacon`. Every remote load is traced (trace id, duration, `performance.measure`, on failure a code + hint); `platformDiagnostics()` in the console. `X-Correlation-Id` on every `/api` call.

### ADR-0017
**The shell owns cross-section navigation.** Remotes emit `PlatformEvent.*` navigation events on the event bus; the shell maps them to URLs via the registry and navigates (or explains that the target is not deployed).

### ADR-0018
**Legacy app as an isolated remote.** It exposes `./Mount`, shares nothing (own Angular, zone.js, design library), is mounted under `/<legacy>/` by a shell host component, and talks only through the `@platform/legacy-bridge` contract (auth, entitlements, navigation, logging). Retired screen by screen with redirects (strangler). Rejected: legacy as the shell (owns the platform forever), iframe (focus, scrolling, deep links, token hand-off), URL split only (full reloads, two headers; acceptable as a stopgap).

### ADR-0019
**Hosting.** One private S3 bucket and one CloudFront distribution per environment; Origin Access Control; immutable version folders; root files never cached; a CloudFront Function for deep links (no 403/404 → index.html error pages); `/api/*` on the same distribution.

### ADR-0020
**Deploy identity and manifest safety.** GitLab OIDC → one IAM role per app per environment, limited to its own prefix plus the manifest; manifest updates are read-modify-write with S3 conditional writes (`If-Match`), plus `resource_group` within one repo; release history per app.

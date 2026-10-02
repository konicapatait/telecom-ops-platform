# Platform handbook

The single summary of what was built, every decision behind it, and what we learned on the way. It replaces the former `docs/adr/` folder. Code comments still cite decisions as `(ADR-00NN)`: those IDs point at the [decision register](#3-decision-register) below.

Last updated: 2026-10-02.

## Contents

1. [What was built](#1-what-was-built)
2. [Architecture at a glance](#2-architecture-at-a-glance)
3. [Decision register](#3-decision-register)
4. [Lessons learned](#4-lessons-learned)
5. [Working rules and conventions](#5-working-rules-and-conventions)
6. [Verification state](#6-verification-state)
7. [Choices, assumptions and open items](#7-choices-assumptions-and-open-items)
8. [Recording a new decision](#8-recording-a-new-decision)

---

## 1. What was built

Phases 0–5 of the implementation plan are done. Each phase gate is an automated E2E test ([ADR-0016](#adr-0016)).

| Phase / change           | Delivered                                                                                                                                                                                                        | Gate (E2E spec)                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 0. Foundations           | Nx 23 monorepo, shared federation config, contracts, auth (Okta + mock), entitlements, MSW mocks, generator, GitLab per-app pipelines, deploy/smoke/rollback scripts, external design system (vendored tarballs) | A generated remote is deployed through the pipeline scripts and loads in the shell |
| 1. Shell                 | Chrome (header, nav, persona switcher), runtime manifest, typed route registry, per-section fallback with Retry                                                                                                  | `phase-1-shell`: a stopped remote breaks only its own section; Retry recovers it   |
| 2. Case slice            | `libs/case-workspace` (queue, case view, tab host), capabilities: audit trail, usage & billing, attachments, case resolution; Fraud domain                                                                       | `phase-2-case`: lazy keep-alive tabs, per-tab isolation, `?tab=` deep links        |
| 3. Rollout               | Billing disputes, Service assurance, Number porting, Partner oversight (3 journeys); case search; shell-owned `OPEN_CASE`                                                                                        | `phase-3-rollout`: every domain uses the shared layout, no forks, tabs are config  |
| Case management redesign | One hub page `/case-management`: customer overview + one tab per case-domain remote; legacy URLs redirect                                                                                                        | `case-management-hub`                                                              |
| Four-tab case screen     | Case decision · Triggering info · Audit log · Attachments; contained tabs (DS 0.2.0); redesigned audit log                                                                                                       | covered by phase 2/3 and hub specs                                                 |
| Observability            | Structured logger, traced remote loads with error codes and hints, `platformDiagnostics()`, HTTP correlation ids, file-header check                                                                              | unit specs + troubleshooting guide                                                 |
| 4. Full profiles         | `libs/layout-360`, Customer full profile, Agent full profile, subscriber search in the header; no reload between case and profile                                                                                | `phase-4-360`                                                                      |
| Rename                   | "Subscriber 360" → **Customer full profile**, "Partner 360" → **Agent full profile** (labels and URLs)                                                                                                           | `phase-4-360`                                                                      |
| 5. Reporting             | `mfe-reporting`: URL filters, stat tiles, line and bar charts (validated palette), report table, CSV export                                                                                                      | `phase-5-reporting`                                                                |

Phase 6 (backend cutover and hardening) has not started; it needs real endpoints, Okta and hosting details (section 7).

**Size today:** 17 deployable apps + `shell-e2e`, 8 libs (plus the separate `@platform/auth-mock` entry), 1 generator, 5 CI scripts, 5 guard scripts, 41 E2E tests.

## 2. Architecture at a glance

Full description with diagrams: [architecture.md](architecture.md). The short version:

- **Shell** (`apps/shell`) owns only the chrome: header, nav, sign-in, global search slot, error boundaries. It loads remotes through a runtime manifest ([ADR-0002](#adr-0002), [ADR-0007](#adr-0007)).
- **Layout families** are build-time libs compiled into each member: `case-workspace` (case screens), `layout-360` (full profiles). Reporting keeps its layout in its app ([ADR-0003](#adr-0003)).
- **Domain remotes** own a route tree; **capability remotes** expose one component, embedded as a tab or panel; the **hub** (`mfe-case-management`) hosts the case-domain remotes as tabs ([ADR-0004](#adr-0004), [ADR-0022](#adr-0022)).
- **Contracts** (`libs/contracts`) are the only API between shell and remotes: types, `CaseEventBus`, `CaseContextStore`, `CustomerContextStore`. Additive changes only ([ADR-0005](#adr-0005)).
- **One shared federation config** (`withPlatformFederation`) makes Angular, RxJS, the design system and the platform libs singletons ([ADR-0008](#adr-0008), [ADR-0018](#adr-0018)).
- **Mock-first** on MSW with a four-layer production firewall ([ADR-0006](#adr-0006)).

### Apps and dev ports

| App                       | Kind / family      | Port | Route or exposed module                               | User-facing name      |
| ------------------------- | ------------------ | ---- | ----------------------------------------------------- | --------------------- |
| shell                     | host               | 4200 | `/`                                                   | –                     |
| mfe-fraud                 | domain / case      | 4201 | `./Routes`, `./FraudOverview`                         | Fraud tab             |
| mfe-cap-audit-trail       | capability         | 4202 | `./AuditTrail`                                        | Audit log tab         |
| mfe-cap-usage-billing     | capability         | 4203 | `./UsageBilling`                                      | Usage & billing panel |
| mfe-cap-attachments       | capability         | 4204 | `./Attachments`                                       | Attachments tab       |
| mfe-cap-case-resolution   | capability         | 4205 | `./CaseResolution`                                    | Case decision tab     |
| mfe-billing-disputes      | domain / case      | 4206 | `./Routes`, `./BillingDisputesOverview`               | Billing disputes tab  |
| mfe-service-assurance     | domain / case      | 4207 | `./Routes`, `./ServiceAssuranceOverview`              | Service assurance tab |
| mfe-number-porting        | domain / case      | 4208 | `./Routes`, `./NumberPortingOverview`                 | Number porting tab    |
| mfe-partner-oversight     | domain / case      | 4209 | `./Routes` (3 journeys), `./PartnerOversightOverview` | Partner oversight tab |
| mfe-cap-account-view      | capability         | 4210 | `./AccountView`                                       | Account & lines panel |
| mfe-cap-case-search       | capability         | 4211 | `./CaseSearch`                                        | Case search (Home)    |
| mfe-case-management       | hub / case         | 4212 | `/case-management`                                    | Case management       |
| mfe-cap-subscriber-search | capability         | 4213 | `./SubscriberSearch`                                  | Header search         |
| mfe-subscriber-view       | domain / 360       | 4214 | `/customer-full-profile/:id`                          | Customer full profile |
| mfe-partner-view          | domain / 360       | 4215 | `/agent-full-profile/:id`                             | Agent full profile    |
| mfe-reporting             | domain / reporting | 4216 | `/reports`                                            | Reports               |

Libs: `contracts`, `mf-manifest`, `auth` (with the separate, unshared `auth-mock` entry point), `entitlements`, `utils`, `mocks`, `case-workspace`, `layout-360`. Tools: `tools/generators`, `tools/ci`, `tools/scripts`, `tools/vitest`, `tools/eslint`.

## 3. Decision register

One entry per decision. IDs never change and are never reused; code comments cite them. "Amended by" means a later entry changed part of it — read both.

| ID                | Decision                                                                                                 | Enforced by                                                     | Amended by |
| ----------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| [0001](#adr-0001) | Design system is an external, exact-pinned package, a runtime singleton, never a remote                  | `shared.config.js`, `check:shared-config`, `contract-smoke.mjs` | –          |
| [0002](#adr-0002) | Layouts belong to families; the shell owns only the chrome                                               | `family:*` lint rules                                           | –          |
| [0003](#adr-0003) | Family layouts are build-time libs, not remotes                                                          | not in `sharedMappings`; CODEOWNERS                             | –          |
| [0004](#adr-0004) | Capabilities are remotes rendered as lazy, keep-alive tabs                                               | `loadCapability`, generator                                     | 0020       |
| [0005](#adr-0005) | Case tabs are typed configuration                                                                        | `CaseDomainConfig`, `RemoteName` union                          | 0023       |
| [0006](#adr-0006) | Mock-first with MSW; four-layer production firewall                                                      | `fileReplacements`, ESLint, `check:no-mocks`                    | –          |
| [0007](#adr-0007) | Runtime manifest per environment; per-section fallback and Retry                                         | `main.ts`, `remote-routes.ts`, E2E                              | –          |
| [0008](#adr-0008) | One shared federation config                                                                             | `check:shared-config`                                           | 0018       |
| [0009](#adr-0009) | GitLab per-app pipelines; affected child pipeline; build once, promote; deploy and roll back by manifest | `.gitlab-ci.yml`, `tools/ci/*`                                  | –          |
| [0010](#adr-0010) | Toolchain pins                                                                                           | `package.json`, `.nvmrc`, `engines`                             | –          |
| [0011](#adr-0011) | Vendored design-system tarballs until a registry exists (temporary)                                      | `vendor/`, `ds:sync`                                            | –          |
| [0012](#adr-0012) | Runtime `app-config.json`; three build flavours                                                          | `runtime-config.ts`, deploy script                              | –          |
| [0013](#adr-0013) | Abstract `AuthService`; Okta or mock by DI override                                                      | `provideAuth`, `provideMockAuth`                                | –          |
| [0014](#adr-0014) | Module boundaries by Nx tags, as lint errors                                                             | `eslint.config.mjs`                                             | –          |
| [0015](#adr-0015) | Apps are created only by the generator                                                                   | review, CODEOWNERS                                              | –          |
| [0016](#adr-0016) | Phase gates are E2E tests                                                                                | `apps/shell-e2e`                                                | –          |
| [0017](#adr-0017) | Case workspace tab-host mechanics                                                                        | `case-workspace` specs, E2E                                     | –          |
| [0018](#adr-0018) | Host shares every Angular secondary (`ignoreUnusedDeps: false`)                                          | `shared.config.js`, E2E                                         | –          |
| [0019](#adr-0019) | Entitlements enforced by the API; the UI hides and explains                                              | mock 403s, capability specs                                     | –          |
| [0020](#adr-0020) | Resolution codes reach the resolution capability as typed inputs                                         | contracts, case view, specs                                     | 0023       |
| [0021](#adr-0021) | Case-domain rollout rules: queue in the layout lib, no forks, shell-owned `OPEN_CASE`                    | `check:layouts`, generator, E2E                                 | 0022       |
| [0022](#adr-0022) | One Case management page; domains as tabs; legacy URLs redirect                                          | hub E2E, `CustomerContextStore`                                 | –          |
| [0023](#adr-0023) | Four-tab case screen; contained tabs; audit-log design                                                   | domain configs, DS 0.2.0, E2E                                   | –          |
| [0024](#adr-0024) | 360 family: layout lib, sections as config, capabilities by account id                                   | `check:layouts`, E2E                                            | 0026       |
| [0025](#adr-0025) | Structured logging, traced remote loads, `platformDiagnostics()`                                         | utils/mf-manifest specs                                         | –          |
| [0026](#adr-0026) | Rename to Customer full profile / Agent full profile (labels and URLs)                                   | E2E, `LEGACY_REDIRECTS`                                         | –          |
| [0027](#adr-0027) | Reporting: own layout, URL filters, validated SVG charts, CSV export                                     | E2E, report-math specs                                          | –          |

### ADR-0001

**Design system: external package, exact pin, runtime singleton, never a remote.**

- `@org/design-system` and `@org/design-tokens` live in their own repo (`../design-system`); the platform pins one exact version for every app.
- Shared as `singleton + strictVersion`. Two copies would mean two overlay containers and focus traps fighting each other.
- Only the shell loads `tokens.css` and `reset.css`; remotes ship no global CSS.
- A design-system bump rebuilds **every** app (Nx cannot see the runtime singleton). Patch: auto-merge after green CI. Minor: merge after green CI. Major: scheduled window, all apps released together.
- Rejected: DS as a remote (extra fetch, untyped), DS in the monorepo (couples release cycles), caret ranges per app (drift, runtime failures).

### ADR-0002

**Layout families; the shell owns only the chrome.**

- Three levels: app chrome (shell) → family layout (`case-workspace`, `layout-360`, reporting in-app) → page content (remotes).
- An app may import `scope:shared` libs plus its own family's layout lib only.
- Rejected: shell owns all layouts (360 and reporting would inherit case chrome); each app owns its layout (five forks of the case screen).

### ADR-0003

**Family layouts are build-time libs, not remotes.**

- Compiled into each member, deliberately not shared: no extra fetch on the hottest screen and typed inputs end to end.
- A layout change rebuilds every family member (Nx `affected` finds them). Keep layouts small and slot-based; differences go into config.

### ADR-0004

**Capabilities are separately deployed remotes, shown as lazy, keep-alive tabs.**

- A capability (`mfe-cap-*`) exposes exactly one standalone component with typed inputs (`caseId`, `caseType`). It fetches its own data and never reads the route or another MFE's state.
- `loadCapability(remote, module)` in `@platform/mf-manifest` is the single loader.
- The generator gives each capability a dev harness that renders it with hero fixture cases.

### ADR-0005

**Case tabs are typed configuration, not layout code.**

- Each domain declares a `CaseDomainConfig` (title, tabs, resolution tab, resolution codes) and passes it to `provideCaseDomain(...)`.
- `CaseTabDefinition.remote` is typed as the generated `RemoteName` union, so a typo fails the build.
- Adding a tab is a one-line config change. Contract changes are additive only and need platform-owner review.

### ADR-0006

**Mock-first with MSW; mocks can never reach production.**

- MSW intercepts real `/api/...` paths. Handlers use origin-agnostic patterns (`*/api/...`) so the same handlers run in the browser and in Vitest.
- Fixtures are typed against the contracts; hero ids are fixed; bulk rows come from a seeded generator.
- Personas (Analyst, Supervisor, Auditor) come from `@platform/auth-mock`; the persona travels as bearer token `mock.<id>`.
- URL flags: `?mockDelay=800`, `?mockFail=<remote>`, `?mockFail=/api/<path>`.
- Firewall, four layers: (1) only `start-mocks.ts` imports mocks and is file-replaced in production; (2) ESLint `no-restricted-imports`; (3) mock auth is a separate, unshared package; (4) `check:no-mocks` scans every production bundle.
- Three build configurations: `development`, `mock` (deployed to dev, used by CI E2E), `production`.

### ADR-0007

**Remotes are discovered from a runtime manifest; one failing remote breaks only its own section.**

- `/mf-manifest.json` per environment, served `no-cache`. The shell build contains no remote URLs.
- Boot: fetch manifest (failure → `{}`) → `initFederation` → `import('./bootstrap')`.
- `loadRemote()` always passes `remoteName` and `remoteEntry`, so a remote that was down at boot registers on Retry.
- Routes come from a typed registry kept by the generator; each falls back to `SectionUnavailableComponent`. Retry calls `router.resetConfig(...)` then navigates again, without a reload.
- Nav shows a section only if its remote is in the manifest and the user holds its entitlement. The manifest carries URLs only.

### ADR-0008

**One shared federation config for the whole workspace.**

- `libs/mf-manifest/src/shared.config.js` alone declares: npm singletons (`@angular/core`, `common`, `router`, `forms`, `platform-browser`, `cdk`, `aria`, `rxjs`, `tslib`, `@org/design-system`) and shared monorepo libs (`contracts`, `mf-manifest`, `auth`, `entitlements`, `utils`).
- Not shared: `mocks`, `auth-mock`, layout libs. Skipped: test entries, `msw*`, Okta SDK (lazy-loaded by the shell).
- Every `federation.config.js` is two lines: `withPlatformFederation({ name, exposes })`. `check:shared-config` fails on any local `shared`, a name mismatch, a non-exact pin or a mapping without a tsconfig path.
- Amended by [ADR-0018](#adr-0018).

### ADR-0009

**GitLab CI: per-app pipeline files, an affected-only child pipeline, build once, promote by manifest.**

- Root pipeline: `workspace:checks` → `plan:apps` → `apps` (dynamic child) → `e2e:composed` (nightly, manual on main).
- Each app owns `apps/<app>/.gitlab-ci.yml`, extending `ci/templates/app.gitlab-ci.yml`: lint, test, build, deploy:dev, smoke:dev, deploy:staging, deploy:prod, rollback:prod.
- `generate-pipeline.mjs` picks apps: `APP=<name>` (one app — independent build and deploy), `FULL_BUILD=true` or a design-system bump (all), else `nx show projects --affected --type=app`.
- Build produces `dist/apps/<app>` (production) and `dist/apps-mock/<app>` (mock). Dev gets mock; staging and prod get the same production artifact.
- Deploy uploads to an immutable `<env>/<app>/<version>/`, writes one manifest entry, appends to `releases.json`. Manifest writes are serialised per environment. Contract smoke checks exposes and shared versions after deploy. Rollback rewrites the manifest entry.
- Storage providers: `s3` (untested) and `local` (dry run, verified).

### ADR-0010

**Toolchain pins.** Node 22, npm 11, Nx 23.2.1, Angular 21.2.25 (zoneless, OnPush required), Native Federation 21.2.6, Vitest 4.1.11 via Analog 2.6.3, Playwright 1.63, MSW 2.15, TypeScript 5.9.3. All exact; Angular, Native Federation and Nx upgrade together via `nx migrate`. npm 11 gates install scripts: approved ones are in `package.json` → `allowScripts`.

### ADR-0011

**Vendored design-system tarballs (temporary).** The DS repo produces `.tgz` packages; the platform commits them to `vendor/` and references them with `file:`. `npm run ds:sync` updates them. To switch to a registry: set `@org:registry` in `.npmrc`, install the exact versions, delete `vendor/`, let Renovate take over, and mark this entry superseded.

### ADR-0012

**Runtime config; three build flavours.** Build time decides only whether mocks exist. Per-environment values (Okta issuer and client id, log endpoint, environment name) live in `/app-config.json`, loaded before bootstrap. The artifact tested in staging is byte-identical to production. No secrets in that file.

### ADR-0013

**Abstract `AuthService`, Okta or mock by DI override.**

- MFEs inject only the abstraction (`user`, `isAuthenticated`, `login`, `logout`, `getAccessToken`).
- `OktaAuthService` (OIDC + PKCE) lazy-imports the SDK. Mock configurations override it with `provideMockAuth(PERSONAS)`.
- `authInterceptor` adds the token to same-origin `/api` calls only. Entitlements load once from `/api/me/entitlements`; `entitlementGuard` sits in each domain's routes. A persona switch reloads the page.

### ADR-0014

**Module boundaries by Nx tags, as lint errors.** Tags `type:`, `family:`, `kind:`, `scope:`. Contracts depend on nothing; shared libs on contracts and shared libs; layouts never on apps; a family app only on shared libs and its own family layout. Selectors use the project prefix; OnPush is required.

### ADR-0015

**Apps only via the generator.** `nx g @platform/tools:mfe <name> --kind=domain|capability|hub [--family=case|360|reporting] [--caseDomain=…]` creates the app, its pipeline file, the `RemoteName` entry, a local manifest port, the shell (or hub) registration and a CODEOWNERS line. Changing the templates does not migrate existing apps.

### ADR-0016

**Phase gates are E2E tests.** `apps/shell-e2e` runs the real shell and remotes on mocks, against local servers or any deployed environment (`BASE_URL=…`). Use `context.route`, not `page.route`, to fake outages: MSW's service worker re-issues requests that `page.route` does not see.

### ADR-0017

**Case workspace tab-host mechanics.**

1. A case domain's `./Routes`: `CaseWorkspaceLayoutComponent` + `provideCaseDomain` + `entitlementGuard`; children: queue and `cases/:caseId` with `caseResolver`.
2. The resolver never fails navigation; "Case not found" renders inside the layout.
3. Tabs = config ∩ entitlements, sorted by `order`.
4. Lazy creation, keep-alive: `opened` is a `linkedSignal` sourced only from `caseId`; its computation must be `untracked`.
5. A case change resets `opened`.
6. Preload: when a case resolves (flag `case.tabPreload`), visible tabs' code is downloaded; preload failures stay silent.
7. Each tab host owns `loading | ready | error` and its own Retry.
8. Selected tab mirrored to `?tab=<id>`.
9. One writer of `CaseContextStore`: the case view.
10. Domain panels use the same host as capabilities.

### ADR-0018

**The host shares every Angular secondary entry point.** With `ignoreUnusedDeps: true` the shell did not offer `@angular/core/rxjs-interop`; remotes used their own copy with a second injector and failed with NG0203. `withPlatformFederation` sets `ignoreUnusedDeps: false`; secondaries needing uninstalled packages (`platform-browser/animations*`) are skipped. Do not turn it back on.

### ADR-0019

**Entitlements are enforced by the API.** The UI hides nav entries, tabs and controls as a convenience; every protected endpoint answers 403 (mocks too). Capabilities render 403 as "No access to …". Downloads go through `HttpClient`. Audit events are written server-side; the UI has no audit write endpoint. The endpoint → entitlement table is in [mocks-and-personas.md](guides/mocks-and-personas.md).

### ADR-0020

**Resolution codes as typed tab-host inputs.** `CaseResolutionInputs extends CaseCapabilityInputs { resolutionCodes }`; the tab host sets extra inputs with `setInput`. The backend validates the code anyway (mock answers 422). Any capability needing more than `caseId`/`caseType` gets a named `…Inputs` contract, never an untyped bag. Rejected: DI into the host's config (hidden coupling), a backend options endpoint (not needed yet). Amended by [ADR-0023](#adr-0023) (the decision became the first tab).

### ADR-0021

**Case-domain rollout rules.**

- The queue lives in `case-workspace` (`CaseQueueComponent`).
- Every case domain's routes have the same shape; the generator scaffolds it for `--family=case --caseDomain=X`.
- No forks: `check:layouts` fails if a case domain has its own tab bar, its own capability loading, or its own view/queue/header/tab host.
- Domains differ only by config; one remote may serve several journeys (Partner oversight: onboarding, ongoing, field audit).
- Cross-domain navigation belongs to the shell: MFEs emit `CaseEvent.OPEN_CASE { caseId, domain }`.
- Embedded capabilities outside case screens load through the shell's `CapabilitySlotComponent`.
- Routing details amended by [ADR-0022](#adr-0022).

### ADR-0022

**One Case management page.**

- Hub remote `mfe-case-management` (`kind:hub`): customer overview + tab strip + outlet. Tabs are config (`CASE_MANAGEMENT_TABS`); domains stay separate remotes.
- URLs: `/case-management/<tab>/…`, `/case-management/customers/:customerId/<tab>/…`, `/case-management/cases/:caseId` (redirects to its tab; target of `OPEN_CASE`).
- `CustomerContextStore` (one writer: the hub) filters every domain's queue via `relevantSubjectIds`.
- Each tab remembers its last URL. Per-tab isolation uses `{ canMatch: remoteAvailable(remote), loadChildren }` then an in-tab fallback, so Retry needs no reload.
- Legacy redirects (`/fraud`, `/disputes`, …) are a guard keeping the rest of the path and query. Remove after one release.

### ADR-0023

**Four-tab case screen.**

- Tabs: Case decision (`mfe-cap-case-resolution`, no entitlement to view, `case:resolve` to submit) · Triggering info (the domain's own panel) · Audit log (`case:audit:view`) · Attachments (`case:attachments:view`). No action rail; Account and Usage left case screens.
- Styling: `ds-tabs variant="contained"` from DS 0.2.0, no local overrides.
- Audit log: live search, workflow track (tiers, current stage and subprocess), table Category · Description · Component · Who, oldest first, coloured category dots, equal timestamps keep backend order.
- Contracts v1.2 (additive): `AuditEvent.category`, `.component`, `.to`; actions `WORKFLOW_MOVED`, `CASE_ACCESSED`.
- Customer Outreach and Conversations (in the design reference) are not built.

### ADR-0024

**360 family (full profiles).**

- `libs/layout-360`: profile banner → KPI strip → section grid; `PanelHostComponent` isolates failures per panel.
- Sections are config (`Section360[]`); a capability gets only the inputs its section lists.
- Shared capabilities accept either contract (`SubscriberCapabilityInputs { accountId }` or case inputs).
- Navigation stays with the shell (`OPEN_SUBSCRIBER_360`, `OPEN_PARTNER_360`).
- No audit log on profile screens, enforced by `check:layouts`.
- Names and URLs amended by [ADR-0026](#adr-0026).

### ADR-0025

**Logging and diagnostics.**

- One logger: `createLogger(source)` / `LoggerService`, line format `[platform] HH:MM:SS.mmm LEVEL source message {context}`, per-load `sessionId`.
- Level at runtime: `?logLevel=debug` or `platformDiagnostics().setLogLevel('debug')`. Warn and error go to `LOG_ENDPOINT` via `sendBeacon`.
- Every remote load is traced: trace id, duration, `performance.measure`, and on failure a code + hint (`NOT_IN_MANIFEST`, `REMOTE_ENTRY_UNREACHABLE`, `EXPOSED_MODULE_MISSING`, `MODULE_IMPORT_FAILED`, `NO_EXPORT`, `SIMULATED`, `UNKNOWN`). Last 200 loads kept.
- Each fallback host logs where the failure surfaced, with the same trace id.
- `X-Correlation-Id` on every `/api` call; expected statuses (`expectHttpErrors(404)`) log at DEBUG.
- Use the platform logger, never `console.*`.

### ADR-0026

**Customer full profile / Agent full profile.** Labels and URLs changed (`/customer-full-profile/:id`, `/agent-full-profile/:id`, nav group "Full profiles"); old URLs redirect keeping id and query. Internal names (apps, libs, contracts, entitlements, APIs) unchanged on purpose. "Partner" stays the term on case screens.

### ADR-0027

**Reporting dashboard.**

- `mfe-reporting` at `/reports` (`reports:view`), layout in the app: filter bar → stat tiles → charts → table.
- Data: `/api/reports/case-volume` and `/api/reports/sla` (contracts v1.4). Report groups = the five Case management tabs.
- Filters live in the URL, one row, date range first, and scope everything including export.
- Charts in plain SVG following the data-viz method: line for weekly volume, horizontal bars with a 90% target for SLA, stat tiles for totals; palette validated by script in light and dark; one fixed colour per group; crosshair tooltip; keyboard support; table as the non-visual view.
- CSV export (RFC 4180) of exactly the table rows.

## 4. Lessons learned

Everything below cost real time once. The prevention is the part to remember.

### Toolchain

| Symptom                                                          | Cause                                     | Prevention                                     |
| ---------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------- |
| `Cannot read properties of null (reading 'edgesOut')` on install | npm 10.9 bug with Vitest 4 optional peers | npm 11                                         |
| Angular CLI refuses to run                                       | Node 20.18 is below Angular 21's minimum  | Node 22 (`.nvmrc`)                             |
| Packages install but don't work                                  | npm 11 blocks install scripts             | List approved scripts in `allowScripts`        |
| Slow or failing installs on a weak network                       | Timeouts                                  | `--maxsockets=3 --fetch-timeout=900000`, retry |
| "Waiting for … in another nx process"                            | Stale Nx daemon or lock                   | Kill Nx processes, `npx nx reset`              |
| Continuous `serve` target cached                                 | `targetDefaults` keyed by executor        | Key target defaults by target name             |

### Federation and shared code

| Symptom                                             | Cause                                                                    | Prevention                                                          |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `Unable to resolve specifier '@platform/auth/mock'` | A sub-path of a shared mapping is externalised but not in the import map | Unshared entry points get a non-prefix name (`@platform/auth-mock`) |
| Mock auth in production bundles                     | Shared libs are bundled whole                                            | Mock code in separate unshared packages + bundle scan               |
| Fixture ids in production                           | The dev harness imported fixtures                                        | `DEV_FIXTURE_CASES` token provided only by `start-mocks`            |
| Mock build replaced the production build            | Same output path                                                         | `dist/apps-mock/<app>` for the mock configuration                   |
| NG0203 for `rxResource` only when composed          | Host didn't share `@angular/core/rxjs-interop`                           | `ignoreUnusedDeps: false` ([ADR-0018](#adr-0018))                   |

### Angular and routing

| Symptom                                 | Cause                                           | Prevention                                 |
| --------------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Kept-alive tabs destroyed on tab switch | `linkedSignal` computation tracked `selected()` | `untracked` inside the computation         |
| Old URL redirect drops `/123?tab=x`     | Prefix `redirectTo` drops the remainder         | Guard-based legacy redirects               |
| Retry doesn't reload a failed remote    | Router caches the failed `loadChildren`         | `resetConfig`, or a `canMatch` guard (hub) |
| Expected 404s show as warnings          | "No decision yet" treated as a failure          | `expectHttpErrors(404)`                    |
| KPI disagrees with the list below it    | Counted from a different source                 | Derive both from the same computed signal  |

### Tests

| Symptom                           | Cause                                        | Prevention                                                                  |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| MSW handlers don't match in Node  | Relative paths                               | Origin-agnostic patterns `*/api/...`                                        |
| `TransformStream is not defined`  | jsdom lacks it                               | Mocks lib tests run in the Node environment; app specs import fixtures only |
| `whenStable()` hangs              | A pending HTTP request                       | `TestBed.tick()`, flush, then wait                                          |
| Tab click does nothing in jsdom   | aria tabs listen to `pointerdown`            | Dispatch `pointerdown`                                                      |
| Unit tests green, build red       | Vitest doesn't type-check                    | Always run the build too                                                    |
| `page.route` misses outages       | MSW's service worker re-issues requests      | `context.route`                                                             |
| Flaky first E2E after `start:all` | Not every port up                            | Wait for every port before running                                          |
| E2E races lazy remotes            | `goto` straight to a deep page               | Navigate in-app and assert each step                                        |
| Ambiguous locators                | Same text in several places                  | `exact`, scoped locators, `getByRole(..., { name: /^…/ })`                  |
| Dev servers break mid-session     | A production build ran in the same workspace | Restart dev servers after building                                          |

### Design system, charts and process

| Symptom                                                   | Cause                                             | Prevention                                                                   |
| --------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| DS component swallows clicks around it                    | Inline hosts                                      | DS 0.2.0 block hosts                                                         |
| Chart tooltip wraps, labels collide, line hidden by label | Layout not checked visually                       | "Nice" axis steps, de-collided labels, label halo; always look at the render |
| Audit rows with equal timestamps in wrong order           | Unstable re-sort                                  | Keep backend order before a stable sort                                      |
| `--family=360` parsed as a number                         | CLI coercion                                      | Schema accepts both; normalise with `String()`                               |
| Scripted bulk edits silently missed                       | Prettier had reformatted the matched text         | Exact edits, then grep to confirm                                            |
| A file truncated by a script                              | Read and write of the same file in one expression | Never write a file while reading it                                          |
| Built-in browser can't run mock mode                      | No service-worker support there                   | Verify with Chrome via Playwright                                            |

## 5. Working rules and conventions

The rules, recipes and verification steps for any change are in the project skill: [.claude/skills/telecom-mfe-platform/SKILL.md](../.claude/skills/telecom-mfe-platform/SKILL.md). The guides hold the details:

| Topic                                   | Guide                                                         |
| --------------------------------------- | ------------------------------------------------------------- |
| Commands, ports, local troubleshooting  | [local-development.md](guides/local-development.md)           |
| Adding an MFE                           | [adding-an-mfe.md](guides/adding-an-mfe.md)                   |
| Pipelines and independent builds        | [ci-cd.md](guides/ci-cd.md)                                   |
| Promotion and rollback                  | [release-and-rollback.md](guides/release-and-rollback.md)     |
| Design-system upgrades                  | [design-system-upgrades.md](guides/design-system-upgrades.md) |
| Mocks, personas, endpoint → entitlement | [mocks-and-personas.md](guides/mocks-and-personas.md)         |
| "Unavailable" section, tab or panel     | [troubleshooting.md](guides/troubleshooting.md)               |
| File headers, comments, logging levels  | [code-conventions.md](guides/code-conventions.md)             |

Non-negotiables in one list:

- New apps only via the generator ([ADR-0015](#adr-0015)).
- Shared federation config only in `shared.config.js` ([ADR-0008](#adr-0008)).
- Mocks only in `start-mocks.ts` and specs ([ADR-0006](#adr-0006)).
- Contracts are additive only ([ADR-0005](#adr-0005)).
- Never fork design-system components ([ADR-0001](#adr-0001)).
- Screens differ by configuration, not forked layouts ([ADR-0005](#adr-0005), [ADR-0021](#adr-0021), [ADR-0024](#adr-0024)).
- Platform logger, never `console.*`; every source file starts with a `@file` header ([ADR-0025](#adr-0025), `check:headers`).

## 6. Verification state

As of 2026-10-02:

| Check                                                                     | Result           |
| ------------------------------------------------------------------------- | ---------------- |
| `npm run lint:all` / `test:all`                                           | 28 projects pass |
| `npm run build:all`                                                       | 17 apps build    |
| `check:shared-config`, `check:layouts`, `check:headers`, `check:no-mocks` | pass             |
| E2E against dev servers                                                   | 41 / 41 pass     |
| E2E against a local deployment made by the real deploy scripts            | 41 / 41 pass     |
| Prettier                                                                  | clean            |

## 7. Choices, assumptions and open items

### Choices made at creation

| Question                                   | Answer                                                                                                                              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Scope                                      | Phases 0–1 first, then 2–5 on request, plus the Case management redesign, four-tab case screen, logging and the full-profile rename |
| Design system before a real package exists | Sibling stub repo `../design-system`, packed and vendored ([ADR-0011](#adr-0011))                                                   |
| CI platform                                | GitLab CI ([ADR-0009](#adr-0009))                                                                                                   |
| Location                                   | `./telecom-ops-platform` next to `./design-system`                                                                                  |
| Rename depth                               | Labels and URLs only ([ADR-0026](#adr-0026))                                                                                        |

Resolved in the implementation plan: the five case domains (Partner oversight has three journeys); audit is case-specific (no audit on full profiles); `libs/case-workspace` is owned by the case-management team.

### Assumptions to confirm

Each has a working default; change it if wrong.

1. **Hosting:** S3-compatible bucket + CDN, one prefix per environment. The S3 path is untested.
2. **Okta:** SPA app with PKCE; fill issuer and client id in `apps/shell/config/<env>/app-config.json`.
3. **CODEOWNERS teams** are placeholders.
4. **Promotion:** dev deploys automatically from `main`; staging and prod are manual, protected jobs.
5. **Entitlement names** follow the plan's examples; align with the entitlement service.
6. **API shapes** (`/api/cases`, `/api/me/entitlements`, overview endpoints, resolution, reports) are proposals for the backend team.
7. **Resolution codes** per domain were invented from the Fraud example; the business must confirm them.
8. **Customer ↔ dealer link** (`relatedSubjectIds`) is a proposal; the backend must define the relationship.
9. **Customer Outreach and Conversations** tabs are not built.

### Phase 6: next

Backend cutover (OpenAPI-typed fixtures, contract tests, `passthrough()` per endpoint), real Okta, real hosting, visual regression, remove legacy redirects once access logs show no hits. See [roadmap.md](roadmap.md).

## 8. Recording a new decision

1. Add a row to the [register table](#3-decision-register) with the next free ID (ADR-0028, …).
2. Add an `### ADR-00NN` entry: the decision in one bold line, then 3–6 bullets — what we do, how it is enforced, what was rejected and why.
3. If it changes an earlier decision, fill "Amended by" on the old row and say what changed in the new entry. Never renumber or delete an entry.
4. Cite the ID in code comments where the rule applies, and update the skill if it adds a rule.

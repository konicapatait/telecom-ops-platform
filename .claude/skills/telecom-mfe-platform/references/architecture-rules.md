# Architecture in one page

## Units
| Unit | Kind | Loaded | Owns | Must not own |
| --- | --- | --- | --- | --- |
| `apps/shell` | host | first paint | auth bootstrap, chrome (header, nav, notifications), root routes, entitlement bootstrap, tokens CSS, error boundary | any layout below the chrome, business data |
| `apps/mfe-<domain>` | remote, exposes `./Routes` | on route | its pages, queues, domain panels, its `CaseDomainConfig` | another domain's code |
| `apps/mfe-cap-<x>` | remote, exposes one component | on tab open | one capability, identical across domains | layout, routing, domain rules |
| `libs/case-workspace` (built), `libs/layout-360` (Phase 4) | build-time lib | compiled into family members | family layout, tab host, header slots | HTTP calls, domain logic |
| `@org/design-system` | external npm package | shared singleton | presentational components, tokens | business logic, contracts |

## Layout levels
1. Chrome (shell), 2. family layout (lib), 3. page content (remotes). Only the case screen has tabs.

## Tags (eslint.config.mjs)
`type:` app | layout | contracts | shared-lib | mocks | e2e | tooling · `family:` host | case | 360 | reporting | capability · `kind:` host | domain | capability · `scope:shared`
- contracts → nothing · shared-lib → contracts, shared-lib · mocks → contracts, shared-lib, mocks · layout → contracts, shared-lib · app → contracts, shared-lib, layout, mocks
- family:case → scope:shared + family:case · family:360 → scope:shared + family:360 · host/capability/reporting → scope:shared

## Federation
- Shared singletons: `@angular/{core,common,router,forms,platform-browser,cdk,aria}`, `rxjs`, `tslib`, `@org/design-system`
- Shared mappings (one instance per page): `@platform/{contracts,mf-manifest,auth,entitlements,utils}`
- NOT shared: `@platform/mocks`, `@platform/auth-mock`, layout libs
- Loaders: `loadRemote`, `loadRemoteRoutes(remote)`, `loadCapability(remote, './X')` from `@platform/mf-manifest`. They always pass `remoteEntry`, so retry after an outage works.

## Boot order (shell)
`main.ts`: fetch `mf-manifest.json` → `initFederation(manifest)` → `import('./bootstrap')` → `setRemoteManifest` → `loadRuntimeConfig()` → `startMocks()` → `bootstrapApplication` → initializer: `auth.init()` → `entitlements.load()`.
Nothing in `main.ts` may import a shared package; it runs before the import map exists.

## Case management page (ADR-0022)
`/case-management[/customers/:id]/<tab>/…` (hub `mfe-case-management`): customer overview + one tab per case-domain remote (`CASE_MANAGEMENT_TABS`). Each tab = `canMatch: remoteAvailable` + in-tab fallback (Retry or re-open recovers). The hub writes `CustomerContextStore`; `CaseQueueComponent` filters by `relevantSubjectIds`. `/case-management/cases/:id` resolves a case to its tab. Old `/fraud`… URLs redirect with path + query kept (guard, not `redirectTo`).

## Case screen (libs/case-workspace, ADR-0017, ADR-0023)
Four tabs: Case decision (`config.resolution`, order 0, gets `resolutionCodes`) · Triggering info (domain panel) · Audit log · Attachments.
Tabs = `CaseDomainConfig.tabs` ∩ entitlements, sorted by `order`. Created on first open, kept alive (`opened` linkedSignal keyed on caseId, computation `untracked`). Preloaded on resolve when flag `case.tabPreload` is on. Each tab host has its own error + Retry. `?tab=<id>` deep links. Resolution capability in the action rail (needs `case:resolve`). The case view is the one writer of `CaseContextStore`.

## Channels (narrowest first)
inputs (`caseId`, `caseType`) → `CaseContextStore` (one writer) → `CaseEventBus` (`CaseEvent.*.v1`) → shell singletons (`AuthService`, `EntitlementsService`, read-only).

## Build flavours
`development` (local serve) · `mock` (dev env + CI E2E, `dist/apps-mock`) · `production` (staging + prod, `dist/apps`). Only `start-mocks.ts` and `environment.ts` differ (`fileReplacements`).

## Full profiles: Customer / Agent (internally "360"; ADR-0024, ADR-0026)
`/customer-full-profile/:id` (mfe-subscriber-view), `/agent-full-profile/:id` (mfe-partner-view) on `Layout360Component`: banner → KPI strip → `Section360[]` grid. Capability sections get `panelInputs` filtered by `inputs` (e.g. `accountId`). Opened via `OPEN_SUBSCRIBER_360` / `OPEN_PARTNER_360` (shell routes using `opensProfile`). No audit log.

## Observability (ADR-0025)
One logger (`createLogger`/`LoggerService`), `sessionId` per page, level via `?logLevel=`, warn/error sink to `LOG_ENDPOINT`. Remote loads traced (traceId, timing, code + hint, history) in mf-manifest; `platformDiagnostics()` in the console.

## Reporting (ADR-0027)
`/reports` (mfe-reporting, own layout): URL filters (`groups`, `from`, `to`) → stat tiles, line chart (opened per week), bar chart (within-SLA % vs 90% target), weekly table, CSV export. Groups = the five Case management tabs, each with a fixed colour slot.

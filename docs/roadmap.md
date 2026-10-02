# Roadmap and phase status

Source: *Telecom Operations Platform: MFE Implementation Plan* (2026-10-02).

| Phase | Status | Gate | Evidence |
| --- | --- | --- | --- |
| **0 Foundations** | ✅ Done | A generated empty remote builds, deploys to dev from its own pipeline, and appears in the dev manifest | `mfe-fraud` + `mfe-cap-audit-trail` generated; deployed with `deploy-app.mjs --env dev --provider local`; `contract-smoke.mjs` green; rollback verified |
| **1 Shell** | ✅ Done | Shell loads a test remote through the manifest; stopping that remote shows the fallback without breaking navigation | `apps/shell-e2e` (6 tests) green against dev servers **and** a local dev deployment |
| **2 Case vertical slice** | ✅ Done | Case `FRD-2026-000142` opens from the queue; tabs lazy and keep-alive; upload appears in audit; Auditor sees Audit but not upload; one stopped capability breaks only its tab | `apps/shell-e2e/src/phase-2-case.spec.ts` (7 tests) + Phase 1 suite: 13/13 green against dev servers **and** a local dev deployment of all 6 apps |
| **3 Case rollout** | ✅ Done | All case domains use `libs/case-workspace`; adding a tab is config-only | `npm run check:case-domains` (static, 5 domains) + `phase-3-rollout.spec.ts` (11 tests); full suite 24/24 green on dev servers and a local dev deployment of all 12 apps |
| **4 360 family** | ✅ Done | Case `BIL-2026-003318` → subscriber 360 → back without a full reload | `phase-4-360.spec.ts` (6 tests, `window` marker proves no reload); full suite 35/35 on dev servers and a local deployment of all 16 apps |
| **5 Reporting** | ✅ Done | Dashboards render from mock series with filters | `phase-5-reporting.spec.ts` (5 tests); full suite 41/41 on dev servers and a local deployment of all 17 apps |
| 6 Cutover and hardening | ⏭ Next | No mock handler active in staging; top journeys pass end to end | |

## Phase 0 checklist
- [x] Nx workspace, Angular 21 (standalone, zoneless, Vitest); one root `package.json`, exact pins
- [x] `@org/design-system` and `@org/design-tokens` at exact versions (vendored; [ADR-0011](platform-handbook.md#adr-0011)); Renovate config
- [x] `libs/mf-manifest`: shared config, `loadRemote`/`loadRemoteRoutes`/`loadCapability`, per-env manifests
- [x] `libs/contracts` v1: `CaseSummary`, `CaseTabDefinition`, `CaseDomainConfig`, `CaseCapabilityInputs`, `CaseEvent` + `CaseEventBus`, `CaseContextStore`, `RemoteName`
- [x] `libs/mocks` skeleton (worker, node server, personas, case fixtures + handlers) and the `fileReplacements` switch
- [x] Generator `nx g @platform/tools:mfe --kind=domain|capability --family=case|360|reporting`
- [x] Reusable CI templates; one pipeline file per app
- [x] Nx tags + `enforce-module-boundaries` as error; shared-config drift check; no-mocks-in-prod scan

## Phase 1 checklist
- [x] App chrome from design-system components: header, left nav (manifest + entitlements), notifications host
- [x] `MockAuthService` + persona switcher; real Okta behind DI (`provideAuth`), SDK lazy-loaded
- [x] Root routes with `authGuard`; global `ErrorHandler`; "section unavailable" fallback with in-place Retry
- [x] `tokens.css` and global styles loaded once, by the shell only

## Phase 2 checklist
- [x] `libs/case-workspace`: layout, case header, tab bar, `CapabilityTabHostComponent`, action-rail slot, `caseResolver` ([ADR-0017](platform-handbook.md#adr-0017))
- [x] `mfe-fraud`: alert queue (filter, paging, priority order), Fraud overview panel (rule hits, risk score) exposed as `./FraudOverview`, `FRAUD_DOMAIN_CONFIG`
- [x] `mfe-cap-usage-billing`: filterable grid (type, flagged-only), flagged-event highlight, totals
- [x] `mfe-cap-attachments`: list, upload (category), download; emits `ATTACHMENT_ADDED`
- [x] `mfe-cap-audit-trail`: read-only timeline; refreshes on case events for its case
- [x] Fixtures and handlers: cases, usage, attachments, audit, fraud overview; shared mock DB (upload writes audit); 403s per entitlement ([ADR-0019](platform-handbook.md#adr-0019))
- [x] Tab preloading on route resolve (flag `case.tabPreload`); keep-alive; entitlement filtering per persona; `?tab=` deep links
- [x] `mfe-cap-case-resolution` generated as a placeholder in the action rail (built in Phase 3)

Found and fixed during Phase 2: Angular secondaries must be shared by the host ([ADR-0018](platform-handbook.md#adr-0018)); `linkedSignal` reset kept-alive tabs ([ADR-0017](platform-handbook.md#adr-0017) §4).

## Phase 3 checklist
- [x] `mfe-cap-case-resolution`: typed reactive form; codes from the domain config via `CaseResolutionInputs` ([ADR-0020](platform-handbook.md#adr-0020)); note-required validator; `POST /resolution`; emits `CASE_RESOLVED` (header → CLOSED, audit refresh)
- [x] `mfe-cap-account-view` (account → lines → devices; partner cases explain "no subscriber account")
- [x] `mfe-cap-case-search` (id, account, name, phone), embedded on Home; emits `OPEN_CASE`, and the shell routes it ([ADR-0021](platform-handbook.md#adr-0021))
- [x] `mfe-billing-disputes`, `mfe-service-assurance`, `mfe-number-porting`: generator + domain config + domain overview panel + fixtures + codes
- [x] `mfe-partner-oversight`: dealer onboarding, ongoing performance and field-audit configs on one remote
- [x] Queue moved into `libs/case-workspace` (`CaseQueueComponent`); generator scaffolds the case-domain shape (`--caseDomain`)
- [x] Fraud gained the Account tab as one config entry (the gate's "config-only" proof)

## Redesign after Phase 3 (product request, [ADR-0022](platform-handbook.md#adr-0022) / [ADR-0023](platform-handbook.md#adr-0023))
- [x] One **Case management** page (`mfe-case-management`, generator `--kind=hub`): customer overview on top, Fraud · Billing disputes · Service assurance · Number porting · Partner oversight as tabs (each still its own remote), cases open inside their tab, tab memory, legacy URLs redirect
- [x] Customer focus: `CustomerContextStore` + `relevantSubjectIds` filter every domain queue; open-case badges per tab; customer search
- [x] Four-tab case screen from the design reference: Case decision · Triggering info · Audit log · Attachments (`ds-tabs variant="contained"`, DS 0.2.0)
- [x] Audit log redesign: search, workflow track (tier → stage/subprocess), Category/Description/Component/Who, oldest first
- [x] E2E: 29 tests (hub 6, Phase 1 6, Phase 2 7, Phase 3 10) green against dev servers **and** a local dev deployment of all 13 apps

## Phase 4 checklist
- [x] `libs/layout-360`: profile banner, KPI strip, section grid; sections as config; panel host with in-panel fallback ([ADR-0024](platform-handbook.md#adr-0024))
- [x] `mfe-subscriber-view` (`/customer-full-profile/:id`) and `mfe-partner-view` (`/agent-full-profile/:id`); account view and usage & billing embedded by `accountId`
- [x] `mfe-cap-subscriber-search` in the shell header (account number, phone, name; partners too)
- [x] `OPEN_SUBSCRIBER_360` / `OPEN_PARTNER_360` routed by the shell; "Customer full profile" / "Agent full profile" in the Case management overview; 360 cross-links
- [x] No audit log on 360 screens (resolved decision), enforced by `check:layouts`
- [x] Generator `--family=360` scaffolds the 360 shape

## Observability and code conventions (request during Phase 4, [ADR-0025](platform-handbook.md#adr-0025))
- [x] Structured platform logger (`createLogger` / `LoggerService`), `sessionId`, runtime `?logLevel=`, backend sink
- [x] Every remote load traced (trace id, timing, `performance.measure`, error code + fix hint, history); UI hosts log where a failure surfaced
- [x] `platformDiagnostics()` console helper (shell and standalone harnesses); boot timings; router errors and slow navigations; expected HTTP statuses not reported as warnings
- [x] `docs/guides/troubleshooting.md`, `docs/guides/code-conventions.md`; every source file has a header comment (`check:headers`, CI)

## Rename (product request, [ADR-0026](platform-handbook.md#adr-0026))
- [x] "Subscriber 360" → **Customer full profile** (`/customer-full-profile/:id`), "Partner 360" → **Agent full profile** (`/agent-full-profile/:id`), nav group **Full profiles**; old URLs redirect; internal names unchanged

## Phase 5 checklist ([ADR-0027](platform-handbook.md#adr-0027))
- [x] `mfe-reporting` at `/reports` with its own layout: filter bar (period presets, date range, case domains), stat tiles, case-volume line chart, SLA bar chart with target, weekly report table
- [x] Case-volume and SLA mock series (26 seeded weeks × 7 domains), `GET /api/reports/{case-volume,sla}` with domain/date filters (400/403)
- [x] Filters in the URL; tiles, charts, table and CSV always agree; refetch keeps the frame
- [x] Palette validated by script (light and dark); charts checked visually for collisions and overflow
- [x] CSV export (RFC 4180) of exactly the rows on screen

## Starting Phase 6 (suggested order)
1. Write `apps/shell-e2e/src/phase-6-cutover.spec.ts` first, against `BASE_URL=<staging>`: no MSW worker registered (`navigator.serviceWorker.getRegistrations()` empty), "Mock data" badge absent, and the top journeys (open case, decision, upload → audit, customer full profile, report export).
2. Per endpoint, as each real API lands: switch its handler to `passthrough()` behind a per-endpoint flag (`?mockOnly=`), type fixtures from the OpenAPI spec, and add a contract test.
3. `contract-smoke.mjs` per app against the deployed manifests (already in the pipeline). Add API contract tests.
4. Performance budgets (shell initial < 800 kB is set; add per-remote budgets to the generator template), `axe` accessibility checks in E2E (tab bar, action forms, charts), and a production-readiness review (Okta config, CORS on the CDN, CSP for import maps, log sink endpoint).
5. Remove the legacy redirects ([ADR-0022](platform-handbook.md#adr-0022) / [ADR-0026](platform-handbook.md#adr-0026)) once access logs show no hits.

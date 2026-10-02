---
name: telecom-mfe-platform
description: Rules, recipes and verification steps for changing the telecom-ops-platform Nx + Angular 21 + Native Federation micro-frontend monorepo. Use for ANY work in this repo, including adding or changing a micro-frontend (domain, capability, hub, 360, reporting), the Case management page and case tabs, customer/agent full profiles (360 views, layout-360), reports dashboards and charts, shell or nav changes, contracts, MSW mocks, fixtures and personas, auth or entitlements, federation shared config, logging and troubleshooting remote loads ("section unavailable", platformDiagnostics, error codes), GitLab pipelines, deploy and rollback, design-system upgrades, code conventions and file headers, or implementing the next roadmap phase.
---

# Telecom MFE platform

A Native Federation shell plus independently deployed remotes, mock-first on MSW, built in an Nx monorepo with GitLab CI. The design system is an **external** package (`@org/design-system`). Decisions are recorded in `docs/adr/` (start at `docs/adr/README.md`). Phase status is in `docs/roadmap.md`.

## Names (ADR-0026)
User-facing **Customer full profile** (`/customer-full-profile/:id`) and **Agent full profile** (`/agent-full-profile/:id`), nav group **Full profiles**. Internally they are still `mfe-subscriber-view`, `mfe-partner-view`, `layout-360`, `OPEN_SUBSCRIBER_360` / `OPEN_PARTNER_360`, `subscribers:view` / `partner360:view`. Never put "360" in UI text. "Partner" stays the term on case screens (Partner oversight).

## Before you change anything
1. Read `docs/roadmap.md` (which phase are we in, and what is its gate?) and the ADRs that apply to your change.
2. Use **Node 22 and npm 11**. Older versions fail; see `references/gotchas.md`.
3. Run everything through Nx: `npx nx <target> <project>`, `npx nx run-many`, `npx nx affected`.

## The rules (each one is enforced; breaking it fails lint or CI)
| Rule | ADR | Enforced by |
| --- | --- | --- |
| Create apps only with `nx g @platform/tools:mfe` | 0015 | review, CODEOWNERS |
| Shared federation deps and libs are declared **only** in `libs/mf-manifest/src/shared.config.js`; apps call `withPlatformFederation({ name, exposes })` | 0008 | `npm run check:shared-config` |
| `@platform/mocks` / `@platform/auth-mock` / `msw` only in `src/start-mocks.ts`, specs, `libs/mocks` | 0006 | ESLint, `check-no-mocks-in-prod.mjs` |
| Never put dev-only code in a **shared** lib (shared libs are bundled whole into production) | 0006, 0008 | no-mocks scan |
| Apps import only `scope:shared` libs plus their own family's layout lib; never another app | 0002, 0014 | `@nx/enforce-module-boundaries` |
| `libs/contracts` depends on nothing; changes are **additive only**; version event names (`.v2`) | 0005 | lint, CODEOWNERS |
| Capability = ONE exposed standalone component, inputs `caseId` and `caseType` only; never reads the route | 0004 | review |
| Case tabs are `CaseTabDefinition` config, not layout code; case domains never fork the case layout | 0005, 0021 | `npm run check:case-domains` |
| Extra capability inputs only through a named contract (`CaseResolutionInputs`) passed via the tab host's `inputs` | 0020 | review |
| MFEs never navigate into another section; emit `OPEN_CASE` / `OPEN_SUBSCRIBER_360` and the shell routes (cases → `/case-management/cases/:id`) | 0021, 0022 | review |
| Case domains are **tabs of the Case management hub** (`case-management.tabs.ts`), never shell nav entries; queues filter by `CustomerContextStore` | 0022 | generator, hub E2E |
| Case screens have the four standard tabs (Case decision · Triggering info · Audit log · Attachments) in `ds-tabs variant="contained"` | 0023 | domain configs, Phase 2/3 E2E |
| Shell owns chrome only; family layouts are build-time libs, **not** shared mappings, **not** remotes | 0002, 0003 | review |
| Remotes ship no global CSS; use `ds-*` components and `--ds-*` tokens | 0001 | review |
| Every component is `OnPush` and zoneless-safe (signals) | 0010 | ESLint |
| Environment values go in runtime `app-config.json` / `mf-manifest.json`, never in build-time env files | 0012 | review |
| Log through the platform logger (`createLogger(source)` / `LoggerService`), never `console.*`; context = correlation ids (`traceId`, `remote`, `caseId`), never tokens or personal data | 0025 | review |
| Load remote code ONLY via `@platform/mf-manifest` (`loadRemote*`, `loadCapability`, `preloadRemoteModule`): that is where tracing, codes and diagnostics live | 0007, 0025 | `check:layouts`, review |
| Every source file starts with a `/** @file … */` header saying what it is for; comments explain why, not what | – | `npm run check:headers` |
| 360 views use `Layout360Component` with `Section360[]` config; no tabs, no own capability loading, **no audit log** | 0024 | `npm run check:layouts` |
| Charts follow the data-viz method: form by job, fixed colour per entity from the validated palette (run the validator), one y-axis, legend + table view, crosshair/bar tooltips with keyboard access, then render and look | 0027 | review, report-math specs |
| Report filters live in the URL and scope everything (tiles = table = CSV) | 0027 | Phase 5 E2E |
| A new architectural decision becomes a new ADR plus a row in `docs/adr/README.md` | – | review |

## Recipes
See `references/recipes.md` for step-by-step versions:
- **Add a case domain:** `nx g @platform/tools:mfe <name> --kind=domain --family=case --caseDomain=<CASE_DOMAIN> --route=<seg> --label="<Nav label>" --entitlement=<x:view> --owner=@group/team`
- **Add a 360 / reporting section:** same, with `--family=360|reporting` (no `--caseDomain`)
- **Add a capability:** `nx g @platform/tools:mfe <name> --kind=capability --label="<Label>" --exposedName=<Pascal>`
- **Add a tab to a case domain:** add a `CaseTabDefinition` to that domain's `CaseDomainConfig` (Phase 2+)
- **Add an API mock:** handler in `libs/mocks/src/handlers`, typed fixture, register in `allHandlers`, plus a Node spec
- **Add an entitlement:** personas in `libs/mocks/src/personas.ts` → registry `entitlement` (nav) → `entitlementGuard` (route) → `*hasEntitlement` (UI)
- **Change the shared config:** edit `shared.config.js` only; rebuild **all** apps
- **Add a 360 section:** one `Section360` entry in the app's `*.sections.ts` (capability: `remote`, `exposedModule`, `inputs: ['accountId']`; local: `<ng-template l360Section="id">`)
- **Add a report or chart:** see `references/recipes.md` §11 (data contract + mock series → `report-math.ts` → chart component following ADR-0027 → E2E that compares tiles, table and CSV)
- **Troubleshoot "unavailable":** the console `WARN federation Remote failed to load` line → `code` + `hint`; `platformDiagnostics()`; `?logLevel=debug` (see `references/troubleshooting.md`)
- **Upgrade the design system:** `npm run ds:sync` (vendored) or merge the Renovate MR; all apps rebuild
- **Implement the next phase:** write that phase's gate as `apps/shell-e2e/src/phase-N-*.spec.ts` FIRST, then build until it passes

## Done means verified
Run the checklist in `references/verification.md`. At minimum:
```bash
npx nx run-many -t lint test
npm run check:shared-config && npm run check:layouts && npm run check:headers
npx nx run-many -t build && npm run check:no-mocks
PW_CHANNEL=chrome npm run e2e
```
Report what you ran and the results. Update `docs/roadmap.md` when a gate passes.

## References
- `references/architecture-rules.md`: the model in one page (layout levels, channels, tags, boot order)
- `references/recipes.md`: step-by-step change recipes with the files each one touches
- `references/verification.md`: what to run and what "green" looks like
- `references/gotchas.md`: problems already hit and their fixes (read before debugging)
- `references/troubleshooting.md`: logging, trace ids, error codes and the diagnostics helper (for diagnosing remote loads)
- `docs/guides/code-conventions.md`: file headers, comments, Angular style, logging levels

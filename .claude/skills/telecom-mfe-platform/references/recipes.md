# Recipes

## 1. Add a case domain
```bash
npx nx g @platform/tools:mfe billing-disputes --kind=domain --family=case --caseDomain=BILLING_DISPUTE \
  --route=disputes --label="Billing disputes" --entitlement=disputes:view --owner=@telecom/billing-team --dry-run
```
Generated: config with the standard tabs and a placeholder code, routes on `CaseQueueComponent` and `CaseViewComponent`, and a `./BillingDisputesOverview` panel. Then set the real codes, which must match backend validation (the mock checks a per-domain prefix in `resolution.handlers.ts`). Drop unneeded tabs, add overview fixtures and a handler, add hero cases, and run `npm run check:case-domains`. Several journeys in one remote: see `apps/mfe-partner-oversight` (one config per sub-path).
Drop `--dry-run`, then:
1. Add `disputes:view` to the right personas in `libs/mocks/src/personas.ts`.
2. Build the page in `apps/mfe-billing-disputes/src/app/` with `nx serve mfe-billing-disputes`.
3. Case family: copy the shape of `apps/mfe-fraud/src/app/fraud.routes.ts`. Wrap routes in `CaseWorkspaceLayoutComponent` with `provideCaseDomain(BILLING_DOMAIN_CONFIG)`, give it a queue at `''` and `CaseViewComponent` at `cases/:caseId` with `resolve: { caseSummary: caseResolver }`. Write the domain config next to it (see `fraud.config.ts`). A domain-owned panel is exposed from the domain remote and listed as a normal tab.
4. Verify inside the shell with `npm run start:all`.

Files touched by the generator: `apps/<p>/**`, `libs/contracts/src/lib/remotes.ts`, `libs/mf-manifest/manifests/local/mf-manifest.json`, `apps/shell/src/app/routing/remote-registry.ts`, `.gitlab/CODEOWNERS`.

## 1b. Add or change a case tab
Edit the domain's `CaseDomainConfig` only. The standard set is Case decision (`resolution`, order 0) · Triggering info (domain panel, 1) · Audit log (2) · Attachments (3). For example, to show Usage again on Fraud, add `{ id: 'usage', label: 'Usage & billing', remote: 'mfe-cap-usage-billing', exposedModule: './UsageBilling', order: 4, entitlement: 'case:usage:view' }`. To add a whole new domain tab on the Case management page, the generator adds one line to `apps/mfe-case-management/src/app/case-management.tabs.ts`.

## 2. Add a capability
```bash
npx nx g @platform/tools:mfe attachments --kind=capability --label="Attachments" --exposedName=Attachments --owner=@telecom/case-management-team
```
- The component gets `caseId` and `caseType` (`input.required`) and fetches its own data with `HttpClient`. No route access.
- Emit cross-MFE events through `CaseEventBus` (`CaseEvent.ATTACHMENT_ADDED`). Never call another MFE.
- Data: use `rxResource` + `HttpClient`; render a 403 as an explicit "No access" state ([ADR-0019](../../../../docs/platform-handbook.md#adr-0019)).
- Specs: `provideHttpClientTesting`, data from `@platform/mocks/fixtures`; see `usage-billing.component.spec.ts`.
- Develop in the harness (`nx serve mfe-cap-attachments`), which offers hero fixture cases via `DEV_FIXTURE_CASES`.
- Mount it: add `{ id, label, remote: 'mfe-cap-attachments', exposedModule: './Attachments', order, entitlement? }` to each domain's `CaseDomainConfig.tabs`.

## 3. Add a mocked API
1. Contract type in `libs/contracts` (additive).
2. Fixture in `libs/mocks/src/fixtures/<x>.ts` keyed by hero ids, typed.
3. Handler in `libs/mocks/src/handlers/<x>.handlers.ts` using `http.get(api('/path'), …)`, `mockDelay()`, `shouldFailApi()`.
4. Register it in `handlers/index.ts` → `allHandlers`.
5. Spec in Node (`server` from `../node`), with `onUnhandledRequest: 'error'`.
6. Stateful writes, e.g. an upload, also append an audit event so other tabs stay truthful.

## 4. Gate a feature by entitlement
Nav: the registry `entitlement` (domain) or `CaseTabDefinition.entitlement` (tab). Route: `canActivate: [entitlementGuard('x')]`. UI: `<button *hasEntitlement="'x'">`. Data: add it to personas. Flags: `entitlements.isEnabled('flag')` and `DEFAULT_FEATURE_FLAGS`.

## 5. Change shared federation config
Edit `libs/mf-manifest/src/shared.config.js` only. Any new shared npm package must be pinned exactly in `package.json`. A new shared lib needs a tsconfig path whose name is **not** a prefix-extension of another shared mapping. Run `npm run check:shared-config`, then rebuild **all** apps (`FULL_BUILD=true` in CI). Write an ADR if it changes what is shared.

## 6. Design-system change
Fix it in `../design-system` (never patch around it here). Bump semver and CHANGELOG, `npm run release:local`, then `npm run ds:sync` here, `npm run build:all`, tests, E2E. Commit `vendor/` and the lockfile.

## 7. Next roadmap phase
1. Copy that phase's gate from `docs/roadmap.md` into `apps/shell-e2e/src/phase-N-<name>.spec.ts` (it fails first).
2. Generate remotes and libs. Layout libs use tags `type:layout`, `family:<f>` and get `project.json`, `vite.config.mts`, `eslint.config.mjs`, tsconfigs like `libs/entitlements`. **Not** shared mappings.
3. Build until the gate passes against dev servers **and** a local dev deployment (see verification.md).
4. Tick the roadmap, add any new decisions to the handbook decision register, and add new lessons to its "Lessons learned" section.

## 8. Independent build and deploy of one app
CI: Run pipeline with `APP=<app>`. Locally:
```bash
npx nx build <app> && npx nx build <app> -c mock
node tools/ci/deploy-app.mjs --app <app> --env dev --version $(git rev-parse --short HEAD) --provider local
node tools/ci/contract-smoke.mjs --app <app> --env dev --provider local
```
Rollback: `node tools/ci/rollback-app.mjs --app <app> --env dev --provider local`.

## 9. Add a 360 view or section ([ADR-0024](../../../../docs/platform-handbook.md#adr-0024))
- New view: `npx nx g @platform/tools:mfe <name> --kind=domain --family=360 --route=<seg> --label="<Label>" --entitlement=<x:view>`. Then set `opensProfile: 'SUBSCRIBER' | 'PARTNER'` on its shell registry entry if it shows a profile by id.
- New section: one `Section360` entry. A capability on 360 must accept `accountId` (or another named `…Inputs` contract), never only `caseId`.
- Never add the audit log to a 360 view (`check:layouts` fails).

## 10. Add logging to new code ([ADR-0025](../../../../docs/platform-handbook.md#adr-0025))
```ts
import { createLogger } from '@platform/utils';
const log = createLogger('my-area');
log.info('Thing happened', { caseId, durationMs });
```
Pick the level by impact (debug detail · info milestone · warn degraded with fallback · error user blocked). Include ids, never tokens. Add a header comment to every new file.

## 11. Add a report or chart ([ADR-0027](../../../../docs/platform-handbook.md#adr-0027))
1. Contract (additive) for the series; seeded mock series in `libs/mocks/src/fixtures/reports.ts`; handler with the same `?domains=&from=&to=` query (400 bad range, 403 without `reports:view`).
2. Aggregate in `apps/mfe-reporting/src/app/model/report-math.ts` (pure, unit-tested). Tiles, charts, table and CSV all read from it.
3. Pick the form by the data's job (time → line, categories → bars, a single headline → stat tile). Reuse `charts/chart.css` and the `--series-N` slots. A new group needs the NEXT slot, never a cycled one. Re-run the palette validator for light and dark if slots change.
4. Keep: one y-axis, recessive grid, text in text colours, legend for ≥ 2 series, direct labels for ≤ 4 (de-collided), crosshair or bar tooltips with keyboard access, the table as the non-visual view.
5. Render in light AND dark and look at it (label collisions, overflow, headroom) before calling it done.
6. E2E: assert the numbers agree across tiles, table and CSV for a filtered URL.

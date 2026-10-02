# Decision log

Architecture Decision Records for telecom-ops-platform. **One decision per file, never edited after acceptance.** To change a decision, write a new ADR that supersedes the old one. Use [0000-template.md](0000-template.md).

| # | Decision | Status | Enforced by |
| --- | --- | --- | --- |
| [0001](0001-design-system-external-package.md) | Design system is an external, exact-pinned npm package, runtime singleton, never a remote | Accepted | `shared.config.js`, `check-shared-config.mjs`, `contract-smoke.mjs`, Renovate |
| [0002](0002-layout-families-shell-owns-chrome.md) | Layouts belong to families; the shell owns only chrome | Accepted | `family:*` boundary rules |
| [0003](0003-family-layouts-are-build-time-libs.md) | Family layouts are build-time libs, not remotes | Accepted (Phase 2/4) | Not in `sharedMappings`; CODEOWNERS |
| [0004](0004-capabilities-as-lazy-keep-alive-tabs.md) | Capabilities are remotes rendered as lazy keep-alive tabs | Accepted (Phase 2) | `loadCapability`, generator |
| [0005](0005-tabs-are-configuration.md) | Case tabs are typed configuration | Accepted (Phase 2) | `CaseDomainConfig`, `RemoteName` union |
| [0006](0006-mock-first-with-msw.md) | Mock-first with MSW; four-layer production firewall | Accepted | `fileReplacements`, ESLint, `@platform/auth-mock`, `check-no-mocks-in-prod.mjs` |
| [0007](0007-runtime-manifest-and-resilient-loading.md) | Runtime manifest per environment; per-section fallback and Retry | Accepted | `main.ts`, `remote-routes.ts`, E2E |
| [0008](0008-single-shared-federation-config.md) | One shared federation config | Accepted | `check-shared-config.mjs` |
| [0009](0009-gitlab-ci-per-app-pipelines.md) | GitLab per-app pipelines; affected child pipeline; build once, promote; manifest deploy and rollback | Accepted | `.gitlab-ci.yml`, `tools/ci/*` |
| [0010](0010-toolchain-versions.md) | Toolchain pins | Accepted | `package.json`, `.nvmrc`, `engines` |
| [0011](0011-vendored-design-system-tarballs.md) | Vendored DS tarballs until the registry exists | Accepted (temporary) | `vendor/`, `ds:sync` |
| [0012](0012-runtime-config-build-once.md) | Runtime `app-config.json`; three build flavours | Accepted | `runtime-config.ts`, deploy script |
| [0013](0013-auth-abstraction-okta-and-mock.md) | Abstract `AuthService`; Okta or Mock by DI override | Accepted | `provideAuth`, `provideMockAuth` |
| [0014](0014-module-boundaries-by-tags.md) | Nx tags enforced as lint errors | Accepted | `eslint.config.mjs` |
| [0015](0015-generator-only-project-creation.md) | Apps are created only by the generator | Accepted | Review, CODEOWNERS |
| [0016](0016-phase-gates-as-e2e-tests.md) | Phase gates are E2E tests | Accepted | `apps/shell-e2e` |
| [0017](0017-case-workspace-tab-host-mechanics.md) | Case workspace: lazy keep-alive tabs, preload, per-tab isolation, `?tab=` deep links | Accepted | `libs/case-workspace` specs, Phase 2 E2E |
| [0018](0018-host-shares-all-angular-secondaries.md) | Host shares every Angular secondary (`ignoreUnusedDeps: false`) | Accepted (amends 0008) | `shared.config.js`, E2E |
| [0019](0019-entitlements-enforced-by-api.md) | Entitlements enforced by the API; UI hides and explains | Accepted | mock handlers (403), capability specs |
| [0020](0020-resolution-codes-via-tab-host-inputs.md) | Resolution codes reach the resolution capability as typed tab-host `inputs` (`CaseResolutionInputs`) | Accepted (amends 0004) | contracts, case-view, resolution specs |
| [0021](0021-case-domain-rollout-rules.md) | Case-domain rollout: queue in the layout lib, no forks, shell-owned `OPEN_CASE` navigation, multi-journey remotes | Accepted (amended by 0022) | `check:case-domains`, generator, Phase 3 E2E |
| [0022](0022-case-management-hub.md) | One Case management page: customer overview + each case-domain remote as a tab; legacy URLs redirect | Accepted | hub E2E, `CustomerContextStore`, generator `--kind=hub` |
| [0024](0024-360-family.md) | 360 family: layout-360 lib, sections as config, capabilities by `accountId`, shell-routed profile events, no audit on 360 | Accepted | `check:layouts`, Phase 4 E2E |
| [0026](0026-full-profile-naming.md) | "Subscriber 360" → **Customer full profile**, "Partner 360" → **Agent full profile** (labels + URLs, old URLs redirect; internal names unchanged) | Accepted (amends 0024) | Phase 4 E2E, `LEGACY_REDIRECTS` |
| [0027](0027-reporting-dashboard.md) | Reporting: own-layout dashboard, URL filters, validated SVG charts, CSV export | Accepted | Phase 5 E2E, report-math specs |
| [0025](0025-logging-and-diagnostics.md) | Structured logging, traced remote loads (codes + hints), `platformDiagnostics()` | Accepted | utils/mf-manifest specs, troubleshooting guide |
| [0023](0023-four-tab-case-screen.md) | Four-tab case screen (Case decision · Triggering info · Audit log · Attachments); contained tabs; audit-log design | Accepted (amends 0005, 0020) | domain configs, DS 0.2.0, Phase 2/3 E2E |

## Resolved in the implementation plan
- Case domains: Fraud, Billing disputes, Service assurance, Number porting, Partner oversight (dealer onboarding, ongoing performance, field audit).
- Audit is case-specific: the audit tab appears only on case screens, not on 360 screens.
- `libs/case-workspace` is owned by the case-management team (CODEOWNERS).

## Choices made when this repo was created (2026-10-02)
| Question | Answer |
| --- | --- |
| Scope of the first build | **Phase 0 and Phase 1**, then Phases 2–5 on request, plus the Case management redesign (ADR-0022), the four-tab case screen (ADR-0023), logging (ADR-0025) and the full-profile naming (ADR-0026) |
| Design system before a real package exists | **Sibling stub repo** `../design-system`, packed and vendored (ADR-0011) |
| CI platform | **GitLab CI** (ADR-0009) |
| Location | `./telecom-ops-platform` next to `./design-system` |

## Assumptions to confirm
These were not specified. Each has a sensible default in place, so change it if it's wrong.
1. **Hosting:** S3-compatible bucket plus CDN, one prefix per environment (`DEPLOY_BUCKET`, `PUBLIC_BASE_URL_<ENV>`). The S3 path is untested.
2. **Okta:** SPA app with PKCE. Fill issuer and client id in `apps/shell/config/<env>/app-config.json`.
3. **Teams in CODEOWNERS:** `@telecom/platform-team`, `@telecom/platform-owner`, `@telecom/fraud-team`, `@telecom/case-management-team`, `@telecom/customer-360-team` are placeholders.
4. **Promotion policy:** dev deploys automatically from `main`. Staging and prod are manual jobs on `main`, protected through GitLab protected environments.
5. **Entitlement names** (`fraud:view`, `case:usage:view`, …) follow the plan's examples. Align them with the entitlement service.
6. **API shape** for `/api/cases` (paged `{ items, total, page, size }`, `q` search) and `/api/me/entitlements` (`{ entitlements, featureFlags }`) is a proposal for the backend team. So are the per-domain overview endpoints and `POST /api/cases/:id/resolution` (see the mocks guide).
8. **Customer ↔ dealer links** (`relatedSubjectIds`, e.g. the dealer that swapped a subscriber's SIM) are a proposal: the backend must define the relationship (activation dealer? servicing dealer?).
9. **Customer Outreach / Conversations** tabs in the design reference were not requested and are not built.
7. **Resolution codes** per domain (`*.config.ts`) were invented from the plan's Fraud example. The business needs to confirm them, and the backend must validate them.

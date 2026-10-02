# ADR-0021: Rules for rolling out case domains (queue in the layout, no forks, shell-owned cross-domain navigation)

- **Status:** Accepted (§5–6 routing amended by [ADR-0022](0022-case-management-hub.md): domains are tabs of the Case management page; OPEN_CASE goes to `/case-management/cases/:id`)
- **Date:** 2026-10-02
- **Source:** Phase 3 gate: all case domains use `libs/case-workspace` with no layout forks; adding a tab is config-only

## Decision
1. **The queue lives in the layout lib.** `CaseQueueComponent` (`libs/case-workspace`) lists the current domain's cases (`CaseDomainConfig.domain`, optional additive `queueTitle`), critical first, with status filter and paging. Fraud's Phase 2 queue moved there. The plan's layout table says case-workspace owns "queue list / case view".
2. **A case domain's `./Routes` always has the same shape:** `CaseWorkspaceLayoutComponent` + `provideCaseDomain(CONFIG)` + `entitlementGuard`, children `''` → `CaseQueueComponent` and `cases/:caseId` → `CaseViewComponent` with `caseResolver`. The generator scaffolds exactly this for `--family=case` (it now requires `--caseDomain`) and generates a placeholder domain overview panel exposed as `./<Name>Overview`.
3. **No forks, enforced:** `npm run check:case-domains` (CI `workspace:checks`) fails when a case-family domain's routes do not use the three shared components, or when its sources contain their own tab bar (`DsTabs`), their own capability loading (`loadCapability`/`preloadRemoteModule`), or a component that looks like a case view, queue, header or tab host.
4. **Domains differ only by config:** tabs, labels and resolution codes. Example: Porting removed Usage; partner journeys have no Account or Usage and relabel Attachments "Documents"; Fraud gained Account as one config entry.
5. **One remote may serve several journeys** (`mfe-partner-oversight`: onboarding, ongoing, field audit). Each journey is its own `CaseDomainConfig` on the same shared layout, under its own sub-path. A small journey switcher (navigation only) sits above the layout.
6. **Cross-domain navigation belongs to the shell.** MFEs never build URLs of other sections. They emit `CaseEvent.OPEN_CASE { caseId, domain }` (contracts v1.1). The shell maps domain → section and sub-path through `ShellRemoteRoute.caseDomains` (maintained by the generator) and navigates, or shows a toast if no deployed section serves that domain.
7. **Embedded capabilities outside the case screen** (case search on Home) load through the shell's `CapabilitySlotComponent`, which isolates failures the same way the case tab host does.

## Consequences
- A sixth case domain = `nx g … --family=case --caseDomain=X`, then fill in config, codes, overview panel and fixtures. Nothing else changes.
- The Phase 3 E2E suite opens a hero case in each of the six queues and asserts that `cw-case-queue` and `cw-case-view` render it.

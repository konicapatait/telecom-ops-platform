# ADR-0017: How the case workspace loads, keeps alive and isolates capability tabs

- **Status:** Accepted
- **Date:** 2026-10-02
- **Builds on:** ADR-0003, ADR-0004, ADR-0005

## Context
Phase 2 implemented `libs/case-workspace`. The plan fixed the behaviour: lazy, keep-alive, per-tab failure isolation. Several mechanics were still open.

## Decision
1. **Routing shape.** A case domain's `./Routes` wraps everything in `CaseWorkspaceLayoutComponent` with `provideCaseDomain(CONFIG)` and `entitlementGuard('<domain>:view')`. The children are the domain queue (`''`) and `CaseViewComponent` at `cases/:caseId` with `resolve: { caseSummary: caseResolver }`.
2. **The resolver never fails navigation.** `caseResolver` returns `null` on error and the view renders "Case not found" inside the layout.
3. **Tabs = config ∩ entitlements**, sorted by `order`. The resolution capability renders in the **action rail**, only with its entitlement (`case:resolve`).
4. **Lazy creation, keep-alive.** `opened: Set<tabId>` starts with the selected tab, and a tab is added on first selection. `@if (opened().has(id))` creates `cw-capability-tab-host` once, and `ds-tabs` (`preserveContent`) keeps hidden panels' DOM and component instances. `opened` is a `linkedSignal` whose source is **`caseId` only**. Its computation must be `untracked`, otherwise reading `selected()` resets it on every tab switch and destroys the kept-alive tabs. A unit test and the E2E gate catch this bug, which happened during Phase 2.
5. **Case change** resets `opened`, so the previous case's components are destroyed. Tab hosts re-push `caseId`/`caseType` to any instance that survives.
6. **Preload.** When a case resolves and flag `case.tabPreload` is on, `preloadRemoteModule()` downloads every visible tab's module (code only, nothing instantiated). Preload failures are silent; the real load on open reports them, so an outage is logged once.
7. **Isolation.** Each `CapabilityTabHostComponent` owns its state (`loading` | `ready` | `error`, exposed as `data-state`) and its own Retry. A failed remote affects only its tab.
8. **Deep links.** The selected tab is mirrored to `?tab=<id>` (`replaceUrl`). Opening `…/cases/X?tab=audit` selects it.
9. **One writer of `CaseContextStore`:** the case view sets it when the case resolves and clears it on destroy. The shell header shows a "Case …" badge from it.
10. **Domain panels use the same host.** Fraud's overview is exposed by `mfe-fraud` as `./FraudOverview` and listed as a normal tab.

## Consequences
- Adding or removing a tab stays a config change (Phase 3 gate).
- `libs/case-workspace` has exactly one HTTP call (the resolver). Everything else comes from capabilities.

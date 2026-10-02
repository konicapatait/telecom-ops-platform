# @platform/case-workspace

The shared case-management layout ([ADR-0002](../../docs/platform-handbook.md#adr-0002), [ADR-0003](../../docs/platform-handbook.md#adr-0003), [ADR-0017](../../docs/platform-handbook.md#adr-0017)). It is a **build-time** library compiled into every case-family remote. It is **not** a federation shared mapping and **not** a remote. Owned by the case-management team (CODEOWNERS).

```ts
// apps/mfe-<domain>/src/app/<domain>.routes.ts (exposed as ./Routes)
export default [
  {
    path: '',
    component: CaseWorkspaceLayoutComponent,
    providers: [provideCaseDomain(FRAUD_DOMAIN_CONFIG)],
    canActivate: [entitlementGuard('fraud:view')],
    children: [
      { path: '', component: CaseQueueComponent },
      { path: 'cases/:caseId', component: CaseViewComponent, resolve: { caseSummary: caseResolver } },
    ],
  },
] satisfies Routes;
```

| Export                                             | What                                                                                                  |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `provideCaseDomain(config)` / `CASE_DOMAIN_CONFIG` | The domain's `CaseDomainConfig` (tabs are configuration, [ADR-0005](../../docs/platform-handbook.md#adr-0005))                                    |
| `CaseWorkspaceLayoutComponent`                     | Family frame: domain title + outlet                                                                   |
| `CaseViewComponent`                                | Case header, entitlement-filtered tabs (lazy, keep-alive), action rail with the resolution capability |
| `CapabilityTabHostComponent`                       | Loads one capability remote into a `ViewContainerRef`; per-tab "unavailable" + Retry                  |
| `caseResolver`                                     | Loads `CaseSummary` for `:caseId` (null when not found)                                               |

Rules: no domain logic, no capability-specific HTTP. The only HTTP calls are the queue list and the case resolver. Domains must not fork any of this (`npm run check:case-domains`, [ADR-0021](../../docs/platform-handbook.md#adr-0021)).

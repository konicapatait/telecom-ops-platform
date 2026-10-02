/**
 * @file Routes of mfe-case-management, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';
import { entitlementGuard } from '@platform/entitlements';
import { loadRemoteRoutes } from '@platform/mf-manifest';
import { CASE_MANAGEMENT_TABS } from './case-management.tabs';
import { CaseManagementComponent } from './hub/case-management.component';
import { DomainTabUnavailableComponent } from './hub/domain-tab-unavailable.component';
import { customerResolver, firstEntitledTab, openCaseGuard, remoteAvailable } from './hub/guards';

/** One route pair per tab: the domain remote's ./Routes when it can load, else the in-tab fallback. */
function tabRoutes(): Routes {
  return CASE_MANAGEMENT_TABS.flatMap((t) => [
    { path: t.path, canMatch: [remoteAvailable(t.remote)], loadChildren: () => loadRemoteRoutes(t.remote) },
    { path: t.path, component: DomainTabUnavailableComponent, data: { label: t.label } },
  ]);
}

const hubChildren = (): Routes => [
  { path: '', pathMatch: 'full', canActivate: [firstEntitledTab], children: [] },
  ...tabRoutes(),
];

/**
 * Exposed as './Routes', mounted by the shell at /case-management (ADR-0022):
 *   /case-management/<tab>/...                              every case, unfiltered
 *   /case-management/customers/:customerId/<tab>/...        focused on one customer
 *   /case-management/cases/:caseId                          resolves the case's tab (target of CaseEvent.OPEN_CASE)
 */
export default [
  { path: 'cases/:caseId', canActivate: [openCaseGuard], children: [] },
  {
    path: 'customers/:customerId',
    component: CaseManagementComponent,
    canActivate: [entitlementGuard('case-management:view')],
    resolve: { customer: customerResolver },
    children: hubChildren(),
  },
  {
    path: '',
    component: CaseManagementComponent,
    canActivate: [entitlementGuard('case-management:view')],
    children: hubChildren(),
  },
] satisfies Routes;

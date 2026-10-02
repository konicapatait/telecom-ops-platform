/**
 * @file Routes of mfe-reporting, exposed to the shell as './Routes' (mounted at /reports).
 */
import type { Routes } from '@angular/router';
import { entitlementGuard } from '@platform/entitlements';
import { ReportDashboardComponent } from './dashboard/report-dashboard.component';

export default [
  {
    path: '',
    canActivate: [entitlementGuard('reports:view')],
    children: [{ path: '', component: ReportDashboardComponent, title: 'Reports' }],
  },
] satisfies Routes;

/**
 * @file Routes of mfe-billing-disputes, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';
import {
  CaseQueueComponent,
  CaseViewComponent,
  CaseWorkspaceLayoutComponent,
  caseResolver,
  provideCaseDomain,
} from '@platform/case-workspace';
import { entitlementGuard } from '@platform/entitlements';
import { BILLING_DISPUTES_DOMAIN_CONFIG } from './billing-disputes.config';

/** Exposed as './Routes'. The shell mounts it at /disputes. Layout comes ONLY from libs/case-workspace (ADR-0021). */
export default [
  {
    path: '',
    component: CaseWorkspaceLayoutComponent,
    providers: [provideCaseDomain(BILLING_DISPUTES_DOMAIN_CONFIG)],
    canActivate: [entitlementGuard('disputes:view')],
    children: [
      { path: '', component: CaseQueueComponent, title: 'Billing disputes' },
      {
        path: 'cases/:caseId',
        component: CaseViewComponent,
        resolve: { caseSummary: caseResolver },
        title: 'Billing disputes case',
      },
    ],
  },
] satisfies Routes;

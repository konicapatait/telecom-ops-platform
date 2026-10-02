/**
 * @file Routes of mfe-fraud, exposed to the shell as './Routes'.
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
import { FRAUD_DOMAIN_CONFIG } from './fraud.config';

/** Exposed as './Routes'. The shell mounts it at /fraud. */
export default [
  {
    path: '',
    component: CaseWorkspaceLayoutComponent,
    providers: [provideCaseDomain(FRAUD_DOMAIN_CONFIG)],
    canActivate: [entitlementGuard('fraud:view')],
    children: [
      { path: '', component: CaseQueueComponent, title: 'Fraud alerts' },
      {
        path: 'cases/:caseId',
        component: CaseViewComponent,
        resolve: { caseSummary: caseResolver },
        title: 'Fraud case',
      },
    ],
  },
] satisfies Routes;

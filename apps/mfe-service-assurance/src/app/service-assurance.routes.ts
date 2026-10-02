/**
 * @file Routes of mfe-service-assurance, exposed to the shell as './Routes'.
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
import { SERVICE_ASSURANCE_DOMAIN_CONFIG } from './service-assurance.config';

/** Exposed as './Routes'. The shell mounts it at /assurance. Layout comes ONLY from libs/case-workspace (ADR-0021). */
export default [
  {
    path: '',
    component: CaseWorkspaceLayoutComponent,
    providers: [provideCaseDomain(SERVICE_ASSURANCE_DOMAIN_CONFIG)],
    canActivate: [entitlementGuard('assurance:view')],
    children: [
      { path: '', component: CaseQueueComponent, title: 'Service assurance' },
      {
        path: 'cases/:caseId',
        component: CaseViewComponent,
        resolve: { caseSummary: caseResolver },
        title: 'Service assurance case',
      },
    ],
  },
] satisfies Routes;

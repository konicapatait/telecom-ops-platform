/**
 * @file Routes of mfe-number-porting, exposed to the shell as './Routes'.
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
import { NUMBER_PORTING_DOMAIN_CONFIG } from './number-porting.config';

/** Exposed as './Routes'. The shell mounts it at /porting. Layout comes ONLY from libs/case-workspace (ADR-0021). */
export default [
  {
    path: '',
    component: CaseWorkspaceLayoutComponent,
    providers: [provideCaseDomain(NUMBER_PORTING_DOMAIN_CONFIG)],
    canActivate: [entitlementGuard('porting:view')],
    children: [
      { path: '', component: CaseQueueComponent, title: 'Number porting' },
      {
        path: 'cases/:caseId',
        component: CaseViewComponent,
        resolve: { caseSummary: caseResolver },
        title: 'Number porting case',
      },
    ],
  },
] satisfies Routes;

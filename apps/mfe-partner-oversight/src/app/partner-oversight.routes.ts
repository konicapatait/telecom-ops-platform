/**
 * @file Routes of mfe-partner-oversight, exposed to the shell as './Routes'.
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
import { PARTNER_JOURNEYS } from './partner-oversight.config';
import { PartnerJourneysComponent } from './partner-journeys.component';

/**
 * Exposed as './Routes', mounted at /partners. Each journey (/partners/onboarding, /ongoing, /field-audit)
 * provides its own CaseDomainConfig to the SAME shared case layout.
 */
export default [
  {
    path: '',
    component: PartnerJourneysComponent,
    canActivate: [entitlementGuard('partners:view')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'onboarding' },
      ...PARTNER_JOURNEYS.map((j) => ({
        path: j.path,
        component: CaseWorkspaceLayoutComponent,
        providers: [provideCaseDomain(j.config)],
        children: [
          { path: '', component: CaseQueueComponent, title: j.label },
          {
            path: 'cases/:caseId',
            component: CaseViewComponent,
            resolve: { caseSummary: caseResolver },
            title: j.config.title,
          },
        ],
      })),
    ],
  },
] satisfies Routes;

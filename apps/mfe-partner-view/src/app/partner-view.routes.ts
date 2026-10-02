/**
 * @file Routes of mfe-partner-view, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';
import { entitlementGuard } from '@platform/entitlements';
import { PartnerViewProfileComponent } from './partner-view-profile.component';

/** Exposed as './Routes'. The shell mounts it at /agent-full-profile; a profile lives at /agent-full-profile/:profileId. */
export default [
  {
    path: '',
    canActivate: [entitlementGuard('partner360:view')],
    children: [
      { path: ':profileId', component: PartnerViewProfileComponent, title: 'Agent full profile' },
      { path: '', pathMatch: 'full', redirectTo: '/' },
    ],
  },
] satisfies Routes;

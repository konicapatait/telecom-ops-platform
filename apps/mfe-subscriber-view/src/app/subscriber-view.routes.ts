/**
 * @file Routes of mfe-subscriber-view, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';
import { entitlementGuard } from '@platform/entitlements';
import { SubscriberViewProfileComponent } from './subscriber-view-profile.component';

/** Exposed as './Routes'. The shell mounts it at /customer-full-profile; a profile lives at /customer-full-profile/:profileId. */
export default [
  {
    path: '',
    canActivate: [entitlementGuard('subscribers:view')],
    children: [
      { path: ':profileId', component: SubscriberViewProfileComponent, title: 'Customer full profile' },
      { path: '', pathMatch: 'full', redirectTo: '/' },
    ],
  },
] satisfies Routes;

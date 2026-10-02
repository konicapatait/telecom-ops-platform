/**
 * @file Routes of mfe-billing-disputes, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';

/** Mirrors how the shell mounts this remote, so links behave the same standalone and composed. */
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'disputes' },
  { path: 'disputes', loadChildren: () => import('./billing-disputes.routes') },
];

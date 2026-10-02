/**
 * @file Routes of mfe-subscriber-view, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';

/** Mirrors how the shell mounts this remote, so links behave the same standalone and composed. */
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customer-full-profile' },
  { path: 'customer-full-profile', loadChildren: () => import('./subscriber-view.routes') },
];

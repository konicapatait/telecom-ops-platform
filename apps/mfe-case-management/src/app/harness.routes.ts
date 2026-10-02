/**
 * @file Routes of mfe-case-management, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';

/** Mirrors how the shell mounts this remote, so links behave the same standalone and composed. */
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'case-management' },
  { path: 'case-management', loadChildren: () => import('./case-management.routes') },
];

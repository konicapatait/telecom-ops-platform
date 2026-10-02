/**
 * @file Routes of mfe-reporting's standalone dev harness, mirroring how the shell mounts it.
 */
import type { Routes } from '@angular/router';

/** Mirrors how the shell mounts this remote, so links behave the same standalone and composed. */
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'reports' },
  { path: 'reports', loadChildren: () => import('./reporting.routes') },
];

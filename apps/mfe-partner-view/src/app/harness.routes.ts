/**
 * @file Routes of mfe-partner-view, exposed to the shell as './Routes'.
 */
import type { Routes } from '@angular/router';

/** Mirrors how the shell mounts this remote, so links behave the same standalone and composed. */
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'agent-full-profile' },
  { path: 'agent-full-profile', loadChildren: () => import('./partner-view.routes') },
];

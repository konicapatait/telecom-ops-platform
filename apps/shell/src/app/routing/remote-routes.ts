/**
 * @file Builds fresh Route objects on every call, so Retry can drop Angular's cached (failed) lazy load.
 */
import { InjectionToken } from '@angular/core';
import type { Routes } from '@angular/router';
import { loadRemoteRoutes } from '@platform/mf-manifest';
import { SectionUnavailableComponent } from '../pages/section-unavailable.component';
import { ShellRemoteRoute } from './remote-registry';

/** Builds fresh Route objects on every call, so Retry can drop Angular's cached (failed) lazy load. */
export const ROUTES_FACTORY = new InjectionToken<() => Routes>('ROUTES_FACTORY');

/**
 * One lazy route per remote. If the remote cannot load, ONLY its section shows the fallback;
 * the chrome, nav and every other section keep working (Phase 1 gate).
 */
export function remoteRoutes(registry: readonly ShellRemoteRoute[]): Routes {
  return registry.map((r) => ({
    path: r.path,
    title: r.label,
    loadChildren: () =>
      loadRemoteRoutes(r.remote).catch(() => [
        { path: '**', component: SectionUnavailableComponent, data: { remote: r.remote, label: r.label } },
      ]),
  }));
}

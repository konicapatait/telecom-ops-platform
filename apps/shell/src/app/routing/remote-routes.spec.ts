import { vi } from 'vitest';
import type { LoadChildrenCallback, Routes } from '@angular/router';

vi.mock('@platform/mf-manifest', () => ({
  loadRemoteRoutes: vi.fn((remote: string) =>
    remote === 'mfe-up' ? Promise.resolve([{ path: '', redirectTo: 'x' }]) : Promise.reject(new Error('down')),
  ),
}));

import { remoteRoutes } from './remote-routes';
import { SectionUnavailableComponent } from '../pages/section-unavailable.component';
import type { ShellRemoteRoute } from './remote-registry';

const load = (routes: Routes, i: number) => (routes[i].loadChildren as LoadChildrenCallback)() as Promise<Routes>;

describe('remoteRoutes', () => {
  const registry = [
    { remote: 'mfe-up', path: 'up', label: 'Up', group: 'Insights' },
    { remote: 'mfe-down', path: 'down', label: 'Down', group: 'Insights' },
  ] as unknown as ShellRemoteRoute[];

  it('loads routes from a reachable remote', async () => {
    expect(await load(remoteRoutes(registry), 0)).toEqual([{ path: '', redirectTo: 'x' }]);
  });

  it('falls back to the section-unavailable page when a remote is down', async () => {
    const routes = await load(remoteRoutes(registry), 1);
    expect(routes[0].component).toBe(SectionUnavailableComponent);
    expect(routes[0].data).toEqual({ remote: 'mfe-down', label: 'Down' });
  });
});

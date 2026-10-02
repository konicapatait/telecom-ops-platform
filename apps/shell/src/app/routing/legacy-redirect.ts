/**
 * @file `redirectTo` with a prefix path drops the rest of the URL (/fraud/cases/X?tab=audit → /case-management/fraud).
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { LEGACY_REDIRECTS } from './remote-registry';

/**
 * `redirectTo` with a prefix path drops the rest of the URL (/fraud/cases/X?tab=audit → /case-management/fraud).
 * A guard on the old prefix rewrites the WHOLE URL instead, keeping remaining segments and query params.
 */
export function legacyRedirect(from: string, to: string): CanActivateFn {
  return (_route, state) => {
    const [path, query] = state.url.split('?');
    const rest = path.slice(`/${from}`.length);
    return inject(Router).parseUrl(`${to}${rest}${query ? `?${query}` : ''}`);
  };
}

export function legacyRoutes(): Routes {
  return LEGACY_REDIRECTS.map((r) => ({
    path: r.from,
    canActivate: [legacyRedirect(r.from, r.to)],
    children: [{ path: '**', children: [] }],
  }));
}

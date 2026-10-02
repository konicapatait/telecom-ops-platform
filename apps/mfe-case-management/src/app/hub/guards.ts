/**
 * @file A domain tab matches only if its remote can load.
 */
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { CanActivateFn, CanMatchFn, ResolveFn } from '@angular/router';
import { Router } from '@angular/router';
import type { CaseSummary, CustomerSummary, RemoteName } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { loadRemoteRoutes } from '@platform/mf-manifest';
import { catchError, firstValueFrom, of } from 'rxjs';
import { CASE_MANAGEMENT_TABS, tabPathFor } from '../case-management.tabs';

/**
 * A domain tab matches only if its remote can load. Otherwise the router falls through to the
 * "unavailable" route for that tab. Nothing is cached on failure, so Retry (same-URL navigation) re-checks.
 */
export function remoteAvailable(remote: RemoteName): CanMatchFn {
  return () =>
    loadRemoteRoutes(remote).then(
      () => true,
      () => false,
    );
}

/** The hub root ('' child, so the URL IS the hub base) → first tab the user may open. */
export const firstEntitledTab: CanActivateFn = (_route, state) => {
  const entitlements = inject(EntitlementsService);
  const tab = CASE_MANAGEMENT_TABS.find((t) => entitlements.has(t.entitlement));
  const base = state.url.split('?')[0].replace(/\/$/, '');
  return tab ? inject(Router).parseUrl(`${base}/${tab.path}`) : true;
};

/**
 * /case-management/cases/:caseId (where the shell sends CaseEvent.OPEN_CASE): look up the case's domain
 * and redirect into the right tab, e.g. /case-management/partners/field-audit/cases/PTR-1. Query params are kept.
 */
export const openCaseGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const caseId = route.paramMap.get('caseId') ?? '';
  const base = state.url.split('?')[0].replace(/\/cases\/[^/]+$/, '');
  const c = await firstValueFrom(
    inject(HttpClient)
      .get<CaseSummary>(`/api/cases/${encodeURIComponent(caseId)}`)
      .pipe(catchError(() => of(null))),
  );
  const tabPath = c && tabPathFor(c.domain);
  const tree = router.parseUrl(tabPath ? `${base}/${tabPath}/cases/${encodeURIComponent(caseId)}` : base);
  tree.queryParams = route.queryParams;
  return tree;
};

/** Resolves the focused customer (null when unknown: the page then shows the search). */
export const customerResolver: ResolveFn<CustomerSummary | null> = (route) =>
  inject(HttpClient)
    .get<CustomerSummary>(`/api/customers/${encodeURIComponent(route.paramMap.get('customerId') ?? '')}`)
    .pipe(catchError(() => of(null)));

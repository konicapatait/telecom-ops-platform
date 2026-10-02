/**
 * @file App initializer: restore the session, load entitlements, start shell-level listeners (ADR-0013).
 * Also logs router errors and slow navigations, the usual first clue when a remote section misbehaves (ADR-0025).
 */
import { inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { AuthService } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { createLogger } from '@platform/utils';
import { listenForCaseNavigation } from './case-navigation';

const log = createLogger('shell');
const routerLog = createLogger('router');
/** Navigations slower than this are logged at INFO (they usually mean a slow remote or API). */
const SLOW_NAVIGATION_MS = 1500;

/** Runs once before the first navigation. */
export async function initSession(): Promise<void> {
  const auth = inject(AuthService);
  const entitlements = inject(EntitlementsService);

  listenForCaseNavigation();
  logNavigation(inject(Router));

  await auth.init();
  if (!auth.isAuthenticated()) {
    log.info('No session: redirecting to sign-in');
    return;
  }
  await entitlements.load().then(
    () => log.info('Session started', { userId: auth.user()?.userId, entitlements: entitlements.count() }),
    (err) => log.error('Entitlements failed to load: the user will see no sections', { reason: String(err) }),
  );
}

function logNavigation(router: Router): void {
  let started = 0;
  router.events.subscribe((e) => {
    if (e instanceof NavigationStart) {
      started = performance.now();
      routerLog.debug('Navigation start', { id: e.id, url: e.url });
    } else if (e instanceof NavigationEnd) {
      const durationMs = Math.round(performance.now() - started);
      if (durationMs > SLOW_NAVIGATION_MS) routerLog.info('Slow navigation', { url: e.urlAfterRedirects, durationMs });
      else routerLog.debug('Navigation end', { url: e.urlAfterRedirects, durationMs });
    } else if (e instanceof NavigationCancel) {
      routerLog.debug('Navigation cancelled', { url: e.url, reason: e.reason });
    } else if (e instanceof NavigationError) {
      routerLog.error('Navigation failed', { url: e.url, reason: String(e.error) });
    }
  });
}

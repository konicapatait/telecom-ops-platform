/**
 * @file `entitlementGuard(name)`: functional route guard that sends users without the entitlement to /forbidden.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EntitlementsService } from './entitlements.service';

/** `canActivate: [entitlementGuard('fraud:view')]`. Sends users without access to /forbidden. */
export function entitlementGuard(entitlement: string): CanActivateFn {
  return async () => {
    const service = inject(EntitlementsService);
    const router = inject(Router);
    if (!service.loaded()) await service.load().catch(() => undefined);
    return service.has(entitlement)
      ? true
      : router.createUrlTree(['/forbidden'], { queryParams: { need: entitlement } });
  };
}

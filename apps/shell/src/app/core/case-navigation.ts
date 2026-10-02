/**
 * @file The shell owns cross-section navigation: MFEs ask with OPEN_CASE / OPEN_SUBSCRIBER_360 / OPEN_PARTNER_360 (ADR-0021, ADR-0024).
 */
import { DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DsNotificationService } from '@org/design-system';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { isRemoteDeployed } from '@platform/mf-manifest';
import { SHELL_REMOTE_ROUTES } from '../routing/remote-registry';
import { caseUrl, profileUrl } from '../routing/case-links';

/** The shell owns cross-section navigation: MFEs ask with OPEN_CASE / OPEN_SUBSCRIBER_360 / OPEN_PARTNER_360 (ADR-0021, ADR-0024). */
export function listenForCaseNavigation(): void {
  const router = inject(Router);
  const toasts = inject(DsNotificationService);
  const sub = inject(CaseEventBus)
    .on(CaseEvent.OPEN_CASE)
    .subscribe(({ caseId, domain }) => {
      const url = caseUrl(SHELL_REMOTE_ROUTES, caseId, (r) => isRemoteDeployed(r.remote));
      if (url) void router.navigateByUrl(url);
      else
        toasts.show(
          `Case management is not available here, so ${caseId} (${domain.replaceAll('_', ' ').toLowerCase()}) cannot be opened.`,
          'warning',
        );
    });
  const bus = inject(CaseEventBus);
  const deployed = (r: { remote: Parameters<typeof isRemoteDeployed>[0] }) => isRemoteDeployed(r.remote);
  const open360 = (kind: 'SUBSCRIBER' | 'PARTNER', id: string) => {
    const url = profileUrl(SHELL_REMOTE_ROUTES, kind, id, deployed);
    if (url) void router.navigateByUrl(url);
    else toasts.show(`${kind === 'SUBSCRIBER' ? 'Customer' : 'Agent'} full profile is not available here.`, 'warning');
  };
  const sub360 = bus.on(CaseEvent.OPEN_SUBSCRIBER_360).subscribe(({ accountId }) => open360('SUBSCRIBER', accountId));
  const partner360 = bus.on(CaseEvent.OPEN_PARTNER_360).subscribe(({ partnerId }) => open360('PARTNER', partnerId));
  inject(DestroyRef).onDestroy(() => [sub, sub360, partner360].forEach((s) => s.unsubscribe()));
}

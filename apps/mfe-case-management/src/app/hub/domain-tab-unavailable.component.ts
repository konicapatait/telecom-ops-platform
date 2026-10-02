/**
 * @file Rendered INSIDE one domain tab when its remote cannot load; the overview and other tabs keep working.
 */
import { ChangeDetectionStrategy, Component, afterNextRender, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DsEmptyState } from '@org/design-system';
import { createLogger } from '@platform/utils';

const log = createLogger('case-management');

/** Rendered INSIDE one domain tab when its remote cannot load; the overview and other tabs keep working. */
@Component({
  selector: 'casemanagement-domain-tab-unavailable',
  imports: [DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ds-empty-state
      icon="warning"
      heading="This section is unavailable"
      [message]="label() + ' could not be loaded. The other tabs still work.'"
      actionLabel="Retry"
      (action)="retry()"
    />
  `,
})
export class DomainTabUnavailableComponent {
  /** From route data. */
  readonly label = input('This tab');
  private readonly router = inject(Router);

  constructor() {
    afterNextRender(() => log.warn('Domain tab unavailable', { tab: this.label(), url: this.router.url }));
  }

  protected retry(): void {
    log.info('Retrying domain tab', { tab: this.label() });
    // Same-URL navigation re-runs the tab's canMatch (remoteAvailable); nothing failed was cached.
    void this.router.navigateByUrl(this.router.url, { onSameUrlNavigation: 'reload' });
  }
}

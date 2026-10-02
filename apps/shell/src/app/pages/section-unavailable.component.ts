/**
 * @file Shown in place of ONE section whose remote failed to load.
 */
import { ChangeDetectionStrategy, Component, afterNextRender, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DsEmptyState } from '@org/design-system';
import { createLogger } from '@platform/utils';
import { ROUTES_FACTORY } from '../routing/remote-routes';

const log = createLogger('shell');

/** Shown in place of ONE section whose remote failed to load. Retry re-attempts the load without a page reload. */
@Component({
  selector: 'shell-section-unavailable',
  imports: [DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ds-empty-state
      icon="warning"
      heading="This section is unavailable"
      [message]="'We could not load ' + label() + '. The rest of the platform is still working.'"
      actionLabel="Retry"
      (action)="retry()"
    />
  `,
})
export class SectionUnavailableComponent {
  /** From route data (withComponentInputBinding). */
  readonly label = input('this section');
  readonly remote = input<string>();

  private readonly router = inject(Router);
  private readonly routesFactory = inject(ROUTES_FACTORY);

  constructor() {
    afterNextRender(() =>
      log.warn('Section unavailable', { section: this.label(), remote: this.remote(), url: this.router.url }),
    );
  }

  protected retry(): void {
    log.info('Retrying section', { section: this.label(), remote: this.remote() });
    // Fresh Route objects drop Angular's cached fallback, so loadChildren runs again.
    this.router.resetConfig(this.routesFactory());
    void this.router.navigateByUrl(this.router.url);
  }
}

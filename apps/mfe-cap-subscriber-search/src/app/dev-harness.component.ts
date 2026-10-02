/**
 * @file Dev harness of mfe-cap-subscriber-search for `nx serve mfe-cap-subscriber-search` (standalone only; never loaded by the shell).
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DsNotificationHost } from '@org/design-system';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { merge, map } from 'rxjs';
import { SubscriberSearchComponent } from './subscriber-search.component';

/** Standalone wrapper used by `nx serve mfe-cap-subscriber-search`: shows the OPEN_*_360 events the shell would route. */
@Component({
  selector: 'subscribersearch-dev-harness',
  imports: [SubscriberSearchComponent, DsNotificationHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="harness">Dev harness · <strong>mfe-cap-subscriber-search</strong></header>
    <main class="harness__main">
      <subscribersearch-subscriber-search />
      @if (last(); as l) {
        <p class="harness__event">{{ l }}</p>
      }
    </main>
    <ds-notification-host />
  `,
  styles: `
    .harness {
      padding: var(--ds-space-2) var(--ds-space-4);
      background: var(--ds-color-surface-sunken);
      border-bottom: 1px solid var(--ds-color-border);
      font-size: var(--ds-font-size-sm);
    }
    .harness__main {
      padding: var(--ds-space-5);
      max-width: 760px;
    }
    .harness__event {
      font-family: var(--ds-font-family-mono);
      margin-top: 160px;
    }
  `,
})
export class DevHarnessComponent {
  protected readonly last = signal('');
  constructor() {
    const bus = inject(CaseEventBus);
    merge(
      bus.on(CaseEvent.OPEN_SUBSCRIBER_360).pipe(map((e) => `OPEN_SUBSCRIBER_360 → ${e.accountId}`)),
      bus.on(CaseEvent.OPEN_PARTNER_360).pipe(map((e) => `OPEN_PARTNER_360 → ${e.partnerId}`)),
    )
      .pipe(takeUntilDestroyed())
      .subscribe((l) => this.last.set(l));
  }
}

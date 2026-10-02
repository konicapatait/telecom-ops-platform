/**
 * @file Dev harness of mfe-cap-case-search for `nx serve mfe-cap-case-search` (standalone only; never loaded by the shell).
 */
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DsNotificationHost } from '@org/design-system';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { CaseSearchComponent } from './case-search.component';

/** Standalone wrapper used by `nx serve mfe-cap-case-search`: shows the OPEN_CASE events the shell would route. */
@Component({
  selector: 'casesearch-dev-harness',
  imports: [CaseSearchComponent, DsNotificationHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="harness">Dev harness · <strong>mfe-cap-case-search</strong></header>
    <main class="harness__main">
      <casesearch-case-search />
      @if (last(); as l) {
        <p class="harness__event">OPEN_CASE → {{ l }}</p>
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
    }
  `,
})
export class DevHarnessComponent {
  protected readonly last = signal('');
  constructor() {
    inject(CaseEventBus)
      .on(CaseEvent.OPEN_CASE)
      .pipe(takeUntilDestroyed())
      .subscribe((e) => this.last.set(`${e.domain} ${e.caseId}`));
  }
}

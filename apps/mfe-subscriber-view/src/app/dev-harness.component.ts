/**
 * @file Dev harness of mfe-subscriber-view for `nx serve mfe-subscriber-view` (standalone only; never loaded by the shell).
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DsNotificationHost } from '@org/design-system';

/** Standalone wrapper used by `nx serve mfe-subscriber-view`. Not exposed, never loaded by the shell. */
@Component({
  selector: 'subscriberview-dev-harness',
  imports: [RouterOutlet, DsNotificationHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="harness">Dev harness · <strong>mfe-subscriber-view</strong> · mocks on</header>
    <main class="harness__main"><router-outlet /></main>
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
    }
  `,
})
export class DevHarnessComponent {}

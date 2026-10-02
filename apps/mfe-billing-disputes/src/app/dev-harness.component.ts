/**
 * @file Dev harness of mfe-billing-disputes for `nx serve mfe-billing-disputes` (standalone only; never loaded by the shell).
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DsNotificationHost } from '@org/design-system';

/** Standalone wrapper used by `nx serve mfe-billing-disputes`. Not exposed, never loaded by the shell. */
@Component({
  selector: 'billingdisputes-dev-harness',
  imports: [RouterOutlet, DsNotificationHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="harness">Dev harness · <strong>mfe-billing-disputes</strong> · mocks on</header>
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

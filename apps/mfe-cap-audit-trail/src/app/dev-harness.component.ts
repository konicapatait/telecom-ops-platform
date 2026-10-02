/**
 * @file Dev harness of mfe-cap-audit-trail for `nx serve mfe-cap-audit-trail` (standalone only; never loaded by the shell).
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DsEmptyState, DsNotificationHost, DsSelect } from '@org/design-system';
import { AuditTrailComponent } from './audit-trail.component';
import { DEV_FIXTURE_CASES } from './dev-fixtures';

/** Standalone wrapper used by `nx serve mfe-cap-audit-trail`: renders the capability with a fixture case, like the tab host does. */
@Component({
  selector: 'audittrail-dev-harness',
  imports: [AuditTrailComponent, DsSelect, DsEmptyState, DsNotificationHost],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="harness">
      Dev harness · <strong>mfe-cap-audit-trail</strong>
      @if (options.length) {
        <ds-select label="Fixture case" [options]="options" [value]="caseId()" (valueChange)="caseId.set($event)" />
      }
    </header>
    <main class="harness__main">
      @if (selected(); as c) {
        <audittrail-audit-trail [caseId]="c.caseId" [caseType]="c.caseType" />
      } @else {
        <ds-empty-state icon="info" heading="No fixture cases" message="The harness needs a mock build (nx serve)." />
      }
    </main>
    <ds-notification-host />
  `,
  styles: `
    .harness {
      display: flex;
      gap: var(--ds-space-4);
      align-items: center;
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
export class DevHarnessComponent {
  private readonly cases = inject(DEV_FIXTURE_CASES);
  protected readonly options = this.cases.map((c) => ({ value: c.caseId, label: `${c.caseId} · ${c.caseType}` }));
  protected readonly caseId = signal(this.cases[0]?.caseId ?? '');
  protected readonly selected = computed(() => this.cases.find((c) => c.caseId === this.caseId()));
}

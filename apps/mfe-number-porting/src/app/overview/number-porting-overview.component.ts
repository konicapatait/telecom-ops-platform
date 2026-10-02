/**
 * @file Domain panel, exposed as './NumberPortingOverview': port direction, carriers and the step that failed.
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsEmptyState, DsSkeleton } from '@org/design-system';
import type { CaseType, PortingOverview, PortingStep } from '@platform/contracts';

const MARK: Record<PortingStep['status'], string> = { DONE: '✔', FAILED: '✘', PENDING: '…' };

/** Domain panel, exposed as './NumberPortingOverview': port direction, carriers and the step that failed. */
@Component({
  selector: 'numberporting-overview',
  imports: [DatePipe, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overview.isLoading()) {
      <ds-skeleton variant="panel" />
    } @else if (overview.error()) {
      <ds-empty-state
        icon="warning"
        heading="Port details unavailable"
        actionLabel="Retry"
        (action)="overview.reload()"
      />
    } @else if (overview.value(); as o) {
      <p class="ov__route">
        <strong>{{ o.direction === 'PORT_IN' ? 'Port in' : 'Port out' }}</strong> of {{ o.msisdn }}:
        {{ o.donorCarrier }} → {{ o.recipientCarrier }}
        <span class="ov__muted">requested {{ o.requestedAt | date: 'MMM d, HH:mm' : 'UTC' }} UTC</span>
      </p>
      @if (o.rejectionReason) {
        <p class="ov__reject" role="note">{{ o.rejectionReason }}</p>
      }
      <ol class="ov__steps">
        @for (s of o.steps; track s.name) {
          <li [attr.data-status]="s.status">
            <span class="ov__mark" aria-hidden="true">{{ mark(s) }}</span>
            <span>{{ s.name }}</span>
            <span class="ov__muted"
              >{{ s.status }}{{ s.at ? ' · ' + (s.at | date: 'MMM d, HH:mm' : 'UTC') : ''
              }}{{ s.detail ? ' · ' + s.detail : '' }}</span
            >
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .ov__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
      margin-left: var(--ds-space-2);
    }
    .ov__reject {
      padding: var(--ds-space-2) var(--ds-space-3);
      border-left: 3px solid var(--ds-color-danger);
      background: var(--ds-color-surface);
    }
    .ov__steps {
      list-style: none;
      padding: 0;
      display: grid;
      gap: var(--ds-space-2);
    }
    .ov__steps li {
      display: flex;
      gap: var(--ds-space-2);
      align-items: baseline;
    }
    .ov__mark {
      width: 20px;
      text-align: center;
      font-weight: 700;
    }
    [data-status='DONE'] .ov__mark {
      color: var(--ds-color-success);
    }
    [data-status='FAILED'] .ov__mark {
      color: var(--ds-color-danger);
    }
  `,
})
export class NumberPortingOverviewComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  private readonly http = inject(HttpClient);
  protected readonly overview = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) => this.http.get<PortingOverview>(`/api/porting/cases/${encodeURIComponent(params)}/overview`),
  });
  protected mark(s: PortingStep): string {
    return MARK[s.status];
  }
}

export default NumberPortingOverviewComponent;

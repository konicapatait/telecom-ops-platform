/**
 * @file Domain panel, exposed as './ServiceAssuranceOverview': the network incident behind the case and its KPIs.
 */
import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton } from '@org/design-system';
import type { CaseType, ServiceIncidentOverview } from '@platform/contracts';

/** Domain panel, exposed as './ServiceAssuranceOverview': the network incident behind the case and its KPIs. */
@Component({
  selector: 'serviceassurance-overview',
  imports: [DatePipe, DecimalPipe, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overview.isLoading()) {
      <ds-skeleton variant="panel" />
    } @else if (overview.error()) {
      <ds-empty-state
        icon="warning"
        heading="Incident details unavailable"
        actionLabel="Retry"
        (action)="overview.reload()"
      />
    } @else if (overview.value(); as o) {
      <dl class="ov__facts">
        <div>
          <dt>Incident</dt>
          <dd>{{ o.incidentType.replace('_', ' ') }}</dd>
        </div>
        <div>
          <dt>Site</dt>
          <dd>{{ o.siteId }} · {{ o.region }}</dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{{ o.startedAt | date: 'MMM d, HH:mm' : 'UTC' }} UTC</dd>
        </div>
        <div>
          <dt>Affected subscribers</dt>
          <dd>{{ o.affectedSubscribers | number }}</dd>
        </div>
        @if (o.networkTicket) {
          <div>
            <dt>NOC ticket</dt>
            <dd>{{ o.networkTicket }}</dd>
          </div>
        }
      </dl>
      <h2 class="ov__h">Site KPIs</h2>
      <ul class="ov__kpis">
        @for (k of o.kpis; track k.name) {
          <li [class.ov__kpi--breached]="k.breached">
            <span class="ov__kpi-value">{{ k.value }}{{ k.unit === '%' ? '%' : ' ' + k.unit }}</span>
            <span>{{ k.name }}</span>
            <span class="ov__muted">threshold {{ k.threshold }}{{ k.unit === '%' ? '%' : ' ' + k.unit }}</span>
            @if (k.breached) {
              <ds-badge tone="danger">Breached</ds-badge>
            } @else {
              <ds-badge tone="success">OK</ds-badge>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: `
    .ov__facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ds-space-2) var(--ds-space-5);
      margin: 0;
    }
    dt {
      font-size: var(--ds-font-size-sm);
      color: var(--ds-color-text-muted);
    }
    dd {
      margin: 0;
    }
    .ov__h {
      font-size: var(--ds-font-size-lg);
      margin: var(--ds-space-4) 0 var(--ds-space-2);
    }
    .ov__kpis {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--ds-space-3);
    }
    .ov__kpis li {
      display: grid;
      gap: var(--ds-space-1);
      padding: var(--ds-space-3);
      background: var(--ds-color-surface);
      border: 1px solid var(--ds-color-border);
      border-radius: var(--ds-radius-md);
    }
    .ov__kpi--breached {
      border-color: var(--ds-color-danger) !important;
    }
    .ov__kpi-value {
      font-size: 24px;
      font-weight: 700;
    }
    .ov__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
  `,
})
export class ServiceAssuranceOverviewComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  private readonly http = inject(HttpClient);
  protected readonly overview = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) =>
      this.http.get<ServiceIncidentOverview>(`/api/assurance/cases/${encodeURIComponent(params)}/overview`),
  });
}

export default ServiceAssuranceOverviewComponent;

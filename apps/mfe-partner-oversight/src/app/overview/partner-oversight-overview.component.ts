/**
 * @file Domain panel for all three partner journeys, exposed as './PartnerOversightOverview'.
 */
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton, type DsBadgeTone } from '@org/design-system';
import type { CaseType, PartnerFinding, PartnerOverview } from '@platform/contracts';

const TONE: Record<PartnerFinding['severity'], DsBadgeTone> = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' };

/** Domain panel for all three partner journeys, exposed as './PartnerOversightOverview'. */
@Component({
  selector: 'partneroversight-overview',
  imports: [DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overview.isLoading()) {
      <ds-skeleton variant="panel" />
    } @else if (overview.error()) {
      <ds-empty-state
        icon="warning"
        heading="Partner profile unavailable"
        actionLabel="Retry"
        (action)="overview.reload()"
      />
    } @else if (overview.value(); as o) {
      <h2 class="ov__name">
        {{ o.name }} <ds-badge>{{ o.tier }}</ds-badge>
      </h2>
      <p class="ov__muted">{{ o.partnerId }} · {{ o.region }}</p>
      <ul class="ov__kpis">
        <li>
          <span class="ov__v">{{ o.activations30d }}</span> activations (30 days)
        </li>
        <li>
          <span class="ov__v">{{ o.qualityScore }}</span> quality score
        </li>
        <li>
          <span class="ov__v">{{ o.chargebackRate }}%</span> chargeback rate
        </li>
      </ul>
      <h3 class="ov__h">Findings ({{ o.findings.length }})</h3>
      <ul class="ov__findings">
        @for (f of o.findings; track f.findingId) {
          <li>
            <ds-badge [tone]="tone(f)">{{ f.severity }}</ds-badge>
            <div>
              <strong>{{ f.title }}</strong>
              <div class="ov__muted">{{ f.detail }}</div>
            </div>
          </li>
        } @empty {
          <li class="ov__muted">No findings.</li>
        }
      </ul>
    }
  `,
  styles: `
    .ov__name {
      display: flex;
      gap: var(--ds-space-2);
      align-items: center;
      margin: 0;
      font-size: var(--ds-font-size-xl);
    }
    .ov__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    .ov__kpis {
      list-style: none;
      padding: 0;
      display: flex;
      gap: var(--ds-space-5);
    }
    .ov__v {
      display: block;
      font-size: 24px;
      font-weight: 700;
    }
    .ov__h {
      font-size: var(--ds-font-size-lg);
      margin: var(--ds-space-4) 0 var(--ds-space-2);
    }
    .ov__findings {
      list-style: none;
      padding: 0;
      display: grid;
      gap: var(--ds-space-3);
    }
    .ov__findings li {
      display: flex;
      gap: var(--ds-space-3);
      align-items: flex-start;
    }
  `,
})
export class PartnerOversightOverviewComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  private readonly http = inject(HttpClient);
  protected readonly overview = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) =>
      this.http.get<PartnerOverview>(`/api/partners/cases/${encodeURIComponent(params)}/overview`),
  });
  protected tone(f: PartnerFinding): DsBadgeTone {
    return TONE[f.severity];
  }
}

export default PartnerOversightOverviewComponent;

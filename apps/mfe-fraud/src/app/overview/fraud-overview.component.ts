/**
 * @file Fraud triggering info (risk score, rule hits), exposed as './FraudOverview' and mounted by the shared tab host.
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton, type DsBadgeTone } from '@org/design-system';
import type { CaseType, FraudOverview, FraudRuleHit } from '@platform/contracts';

const SEVERITY_TONE: Record<FraudRuleHit['severity'], DsBadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'warning',
  HIGH: 'danger',
};

/**
 * Domain-owned panel, exposed as './FraudOverview' and mounted by the SAME tab host as capabilities,
 * so domain panels and capability panels behave alike (ADR-0005).
 */
@Component({
  selector: 'fraud-overview',
  imports: [DatePipe, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overview.isLoading()) {
      <ds-skeleton variant="panel" />
    } @else if (overview.error()) {
      <ds-empty-state icon="warning" heading="Overview unavailable" actionLabel="Retry" (action)="overview.reload()" />
    } @else if (overview.value(); as o) {
      <section class="ov">
        <div class="ov__risk" [attr.data-band]="o.riskBand">
          <span class="ov__score">{{ o.riskScore }}</span>
          <span class="ov__band">Risk · {{ o.riskBand }}</span>
          <meter min="0" max="100" low="40" high="75" optimum="0" [value]="o.riskScore" aria-label="Risk score"></meter>
        </div>
        <p class="ov__summary">{{ o.summary }}</p>
        <h2 class="ov__h">Rule hits ({{ o.ruleHits.length }})</h2>
        <ul class="ov__hits">
          @for (h of o.ruleHits; track h.ruleId) {
            <li>
              <ds-badge [tone]="tone(h.severity)">{{ h.severity }}</ds-badge>
              <div>
                <strong>{{ h.name }}</strong
                ><span class="ov__muted ov__ref">{{ h.ruleId }} · {{ h.at | date: 'MMM d, HH:mm' : 'UTC' }}</span>
                <div class="ov__muted">{{ h.evidence }}</div>
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    .ov__risk {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 0 var(--ds-space-3);
      max-width: 420px;
    }
    .ov__score {
      grid-row: span 2;
      font-size: 40px;
      font-weight: 700;
    }
    .ov__risk[data-band='CRITICAL'] .ov__score,
    .ov__risk[data-band='HIGH'] .ov__score {
      color: var(--ds-color-danger);
    }
    .ov__band {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    meter {
      width: 100%;
    }
    .ov__summary {
      max-width: 72ch;
    }
    .ov__h {
      font-size: var(--ds-font-size-lg);
      margin: var(--ds-space-4) 0 var(--ds-space-2);
    }
    .ov__hits {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--ds-space-3);
    }
    .ov__hits li {
      display: flex;
      gap: var(--ds-space-3);
      align-items: flex-start;
    }
    .ov__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    .ov__ref {
      margin-left: var(--ds-space-2);
    }
  `,
})
export class FraudOverviewComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();

  private readonly http = inject(HttpClient);
  protected readonly overview = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) => this.http.get<FraudOverview>(`/api/fraud/cases/${encodeURIComponent(params)}/overview`),
  });

  protected tone(s: FraudRuleHit['severity']): DsBadgeTone {
    return SEVERITY_TONE[s];
  }
}

export default FraudOverviewComponent;

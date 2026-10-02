/**
 * @file Domain panel, exposed as './BillingDisputesOverview': the disputed bill items and the customer's claim.
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton } from '@org/design-system';
import type { CaseType, DisputeOverview } from '@platform/contracts';
import { formatCurrency } from '@platform/utils';

/** Domain panel, exposed as './BillingDisputesOverview': the disputed bill items and the customer's claim. */
@Component({
  selector: 'billingdisputes-overview',
  imports: [DatePipe, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (overview.isLoading()) {
      <ds-skeleton variant="panel" />
    } @else if (overview.error()) {
      <ds-empty-state
        icon="warning"
        heading="Dispute details unavailable"
        actionLabel="Retry"
        (action)="overview.reload()"
      />
    } @else if (overview.value(); as o) {
      <div class="ov__amount">
        {{ money(o.disputedAmount, o.currency) }} <span class="ov__muted">disputed · {{ o.billingPeriod }}</span>
      </div>
      <blockquote class="ov__claim">{{ o.customerClaim }}</blockquote>
      <table class="ov__items">
        <caption class="ov__muted">
          Disputed items
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Item</th>
            <th scope="col">Category</th>
            <th scope="col" class="ov__num">Amount</th>
          </tr>
        </thead>
        <tbody>
          @for (i of o.items; track i.itemId) {
            <tr>
              <td>{{ i.date | date: 'MMM d' : 'UTC' }}</td>
              <td>
                {{ i.description }} <span class="ov__muted">{{ i.itemId }}</span>
              </td>
              <td>
                <ds-badge>{{ i.category.replace('_', ' ') }}</ds-badge>
              </td>
              <td class="ov__num">{{ money(i.amount, o.currency) }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: `
    .ov__amount {
      font-size: 28px;
      font-weight: 700;
    }
    .ov__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
      font-weight: 400;
    }
    .ov__claim {
      margin: var(--ds-space-3) 0;
      padding: var(--ds-space-2) var(--ds-space-3);
      border-left: 3px solid var(--ds-color-primary);
      background: var(--ds-color-surface);
      max-width: 72ch;
    }
    .ov__items {
      width: 100%;
      border-collapse: collapse;
      background: var(--ds-color-surface);
    }
    caption {
      text-align: left;
      padding: var(--ds-space-2) 0;
    }
    th,
    td {
      text-align: left;
      padding: var(--ds-space-2) var(--ds-space-3);
      border-bottom: 1px solid var(--ds-color-border);
    }
    .ov__num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class BillingDisputesOverviewComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  private readonly http = inject(HttpClient);
  protected readonly overview = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) =>
      this.http.get<DisputeOverview>(`/api/disputes/cases/${encodeURIComponent(params)}/overview`),
  });
  protected money(v: number, c: string): string {
    return formatCurrency(v, c);
  }
}

export default BillingDisputesOverviewComponent;

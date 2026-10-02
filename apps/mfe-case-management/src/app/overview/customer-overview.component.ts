/**
 * @file The overview at the top of Case management: the focused customer's basic details, or a customer search.
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsButton, DsSearchField, DsSkeleton } from '@org/design-system';
import { CaseEvent, CaseEventBus, type CustomerSummary } from '@platform/contracts';
import { formatCurrency } from '@platform/utils';
import { of } from 'rxjs';

/**
 * The overview at the top of Case management: the focused customer's basic details, or a customer search.
 * `mode`: 'selected' (customer in the URL), 'from-case' (no customer chosen, but a case is open: show its subject), 'none'.
 */
@Component({
  selector: 'casemanagement-customer-overview',
  imports: [DatePipe, DsBadge, DsButton, DsSearchField, DsSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-overview.component.html',
  styleUrl: './customer-overview.component.css',
})
export class CustomerOverviewComponent {
  readonly customer = input<CustomerSummary | null>(null);
  readonly mode = input<'selected' | 'from-case' | 'none'>('none');
  readonly selectCustomer = output<string>();
  readonly clearCustomer = output<void>();

  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  protected readonly term = signal('');
  protected readonly results = rxResource({
    params: () => this.term(),
    stream: ({ params }) =>
      params
        ? this.http.get<CustomerSummary[]>('/api/customers', { params: { q: params } })
        : of<CustomerSummary[]>([]),
  });

  protected money(c: CustomerSummary): string {
    return c.balance === undefined ? '–' : formatCurrency(c.balance, c.currency ?? 'USD');
  }

  /** Ask the shell to open this customer's 360 view (Phase 4); no full reload. */
  protected open360(c: CustomerSummary): void {
    if (c.kind === 'PARTNER') this.events.emit(CaseEvent.OPEN_PARTNER_360, { partnerId: c.customerId });
    else this.events.emit(CaseEvent.OPEN_SUBSCRIBER_360, { accountId: c.customerId });
  }

  protected pick(id: string): void {
    this.term.set('');
    this.selectCustomer.emit(id);
  }
}

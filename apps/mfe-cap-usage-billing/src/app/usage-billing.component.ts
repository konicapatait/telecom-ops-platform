/**
 * @file Usage & billing grid, exposed as './UsageBilling'; works by caseId (case tab) or accountId (360 panel) (ADR-0024).
 */
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSelect, DsSkeleton } from '@org/design-system';
import type { CaseType, UsageRecord, UsageType } from '@platform/contracts';
import { formatCurrency, formatDuration } from '@platform/utils';

const TYPES: UsageType[] = ['VOICE', 'DATA', 'SMS', 'TOP_UP', 'SIM_SWAP', 'CHARGE'];

/**
 * Exposed as './UsageBilling'. Filterable usage and billing grid with flagged-event highlight.
 * Inputs: EITHER caseId/caseType (usage behind a case) OR accountId (all usage on the account, Customer full profile) (ADR-0024).
 * Filters are component state, so they survive tab switches (the tab host keeps this instance alive).
 */
@Component({
  selector: 'usagebilling-usage-billing',
  imports: [DatePipe, DsBadge, DsSelect, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usage-billing.component.html',
  styleUrl: './usage-billing.component.css',
})
export class UsageBillingComponent {
  readonly caseId = input<string>();
  readonly caseType = input<CaseType>();
  readonly accountId = input<string>();

  private readonly http = inject(HttpClient);
  protected readonly typeOptions = [
    { value: '', label: 'All types' },
    ...TYPES.map((t) => ({ value: t, label: t.replace('_', ' ') })),
  ];
  protected readonly type = signal('');
  protected readonly flaggedOnly = signal(false);

  protected readonly usage = rxResource({
    params: () => {
      const accountId = this.accountId();
      const caseId = this.caseId();
      if (accountId) return `/api/accounts/${encodeURIComponent(accountId)}/usage`;
      return caseId ? `/api/cases/${encodeURIComponent(caseId)}/usage` : undefined;
    },
    stream: ({ params }) => this.http.get<UsageRecord[]>(params),
  });

  protected readonly forbidden = computed(() => (this.usage.error() as HttpErrorResponse | undefined)?.status === 403);
  protected readonly rows = computed(() =>
    (this.usage.value() ?? [])
      .filter((r) => (!this.type() || r.type === this.type()) && (!this.flaggedOnly() || r.flagged))
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
  protected readonly flaggedCount = computed(() => (this.usage.value() ?? []).filter((r) => r.flagged).length);
  protected readonly total = computed(() => this.rows().reduce((sum, r) => sum + r.amount, 0));

  protected money(amount: number, currency: string): string {
    return formatCurrency(amount, currency);
  }

  protected measure(r: UsageRecord): string {
    if (r.durationSec !== undefined) return formatDuration(r.durationSec);
    if (r.volumeMb !== undefined) return `${r.volumeMb} MB`;
    return '–';
  }
}

export default UsageBillingComponent;

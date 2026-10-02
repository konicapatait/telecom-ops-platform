/**
 * @file The case queue for the current domain (from CaseDomainConfig).
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { DsBadge, DsButton, DsEmptyState, DsSelect, DsSkeleton, type DsBadgeTone } from '@org/design-system';
import {
  CustomerContextStore,
  relevantSubjectIds,
  type CasePriority,
  type CaseStatus,
  type CaseSummary,
  type Page,
} from '@platform/contracts';
import { CASE_DOMAIN_CONFIG } from '../domain/case-domain';

const PRIORITY_TONE: Record<CasePriority, DsBadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};
const PAGE_SIZE = 25;

/**
 * The case queue for the current domain (from CaseDomainConfig). Shared by every case domain, so queues
 * look and behave alike (plan: case-workspace owns "queue list / case view"). Critical first, then oldest.
 */
@Component({
  selector: 'cw-case-queue',
  imports: [RouterLink, DatePipe, DsBadge, DsButton, DsSelect, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-queue.component.html',
  styleUrl: './case-queue.component.css',
})
export class CaseQueueComponent {
  private readonly http = inject(HttpClient);
  private readonly config = inject(CASE_DOMAIN_CONFIG);
  protected readonly queueTitle = this.config.queueTitle ?? `${this.config.title}s`;
  /** Set by the Case management hub when it is focused on one customer (ADR-0022). null = all cases. */
  protected readonly customer = inject(CustomerContextStore).customer;
  private readonly subjects = computed(() => {
    const c = this.customer();
    return c ? relevantSubjectIds(this.config.domain, c) : null;
  });

  protected readonly statusOptions = [
    { value: '', label: 'All statuses' },
    ...(['NEW', 'IN_REVIEW', 'ESCALATED', 'PENDING_INFO', 'CLOSED'] satisfies CaseStatus[]).map((s) => ({
      value: s,
      label: s.replace('_', ' '),
    })),
  ];
  protected readonly status = signal('');
  protected readonly page = signal(0);

  protected readonly cases = rxResource({
    params: () => ({ status: this.status(), page: this.page(), subjects: this.subjects() }),
    stream: ({ params }) =>
      params.subjects && !params.subjects.length
        ? of<Page<CaseSummary>>({ items: [], total: 0, page: 0, size: PAGE_SIZE })
        : this.http.get<Page<CaseSummary>>('/api/cases', {
            params: {
              domain: this.config.domain,
              page: params.page,
              size: PAGE_SIZE,
              ...(params.status ? { status: params.status } : {}),
              ...(params.subjects ? { subjects: params.subjects.join(',') } : {}),
            },
          }),
  });

  protected readonly rows = computed(() => {
    const order: CasePriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    return [...(this.cases.value()?.items ?? [])].sort(
      (a, b) => order.indexOf(a.priority) - order.indexOf(b.priority) || a.openedAt.localeCompare(b.openedAt),
    );
  });
  protected readonly pages = computed(() => Math.max(1, Math.ceil((this.cases.value()?.total ?? 0) / PAGE_SIZE)));

  protected tone(p: CasePriority): DsBadgeTone {
    return PRIORITY_TONE[p];
  }

  protected typeLabel(c: CaseSummary): string {
    return c.caseType.slice(c.domain.length + 1).replaceAll('_', ' ');
  }

  protected filter(status: string): void {
    this.status.set(status);
    this.page.set(0);
  }
}

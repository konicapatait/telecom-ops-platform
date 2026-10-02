/**
 * @file Exposed as './AuditTrail', shown as the "Audit log" case tab (ADR-0023).
 */
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DsEmptyState, DsSkeleton } from '@org/design-system';
import { CaseEvent, CaseEventBus, type AuditCategory, type AuditEvent, type CaseType } from '@platform/contracts';
import { filter, merge } from 'rxjs';

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  TIER: 'Tier',
  STAGE: 'Stage',
  SUBPROCESS: 'Subprocess',
  ACTIVITY: 'Activity',
};

/**
 * Exposed as './AuditTrail', shown as the "Audit log" case tab (ADR-0023). READ-ONLY: the backend writes
 * audit events as a side effect of actions. Layout follows the case-screen design:
 *   search · workflow track (tiers, with the current stage and subprocess) · Category | Description | Component | Who,
 *   oldest first. Refreshes when another MFE reports a change to this case.
 */
@Component({
  selector: 'audittrail-audit-trail',
  imports: [DatePipe, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './audit-trail.component.html',
  styleUrl: './audit-trail.component.css',
})
export class AuditTrailComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();

  private readonly http = inject(HttpClient);
  protected readonly audit = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) => this.http.get<AuditEvent[]>(`/api/cases/${encodeURIComponent(params)}/audit`),
  });
  protected readonly forbidden = computed(() => (this.audit.error() as HttpErrorResponse | undefined)?.status === 403);
  protected readonly query = signal('');

  /**
   * Oldest first, as the log is read. The API is newest-first, so reverse it before the (stable) sort:
   * events written in the same millisecond (a decision and its "moved to Closed") keep their real order.
   */
  private readonly chronological = computed(() =>
    [...(this.audit.value() ?? [])].reverse().sort((a, b) => a.at.localeCompare(b.at)),
  );

  protected readonly rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.chronological().filter(
      (e) => !q || [this.category(e), e.detail, e.component ?? '', e.actor].some((v) => v.toLowerCase().includes(q)),
    );
  });

  /** Workflow track: every tier reached, in order; the current stage/subprocess hang under the last tier. */
  protected readonly track = computed(() => {
    const moves = this.chronological().filter((e) => e.action === 'WORKFLOW_MOVED' && e.to);
    const tiers = [...new Set(moves.filter((e) => e.category === 'TIER').map((e) => e.to as string))];
    const last = (c: AuditCategory) => moves.filter((e) => e.category === c).at(-1)?.to;
    return { tiers, stage: last('STAGE'), subprocess: last('SUBPROCESS') };
  });

  constructor() {
    const bus = inject(CaseEventBus);
    merge(bus.on(CaseEvent.ATTACHMENT_ADDED), bus.on(CaseEvent.CASE_RESOLVED))
      .pipe(
        filter((e) => e.caseId === this.caseId()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.audit.reload());
  }

  protected category(e: AuditEvent): string {
    return CATEGORY_LABEL[e.category ?? 'ACTIVITY'];
  }

  protected tone(e: AuditEvent): string {
    return (e.category ?? 'ACTIVITY').toLowerCase();
  }
}

export default AuditTrailComponent;

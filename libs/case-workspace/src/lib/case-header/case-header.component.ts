/**
 * @file Case header: id, status/priority badges and the subject's key facts.
 */
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsBadge, type DsBadgeTone } from '@org/design-system';
import type { CasePriority, CaseStatus, CaseSummary } from '@platform/contracts';

const PRIORITY_TONE: Record<CasePriority, DsBadgeTone> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
};
const STATUS_TONE: Record<CaseStatus, DsBadgeTone> = {
  NEW: 'info',
  IN_REVIEW: 'info',
  ESCALATED: 'danger',
  PENDING_INFO: 'warning',
  CLOSED: 'success',
};

@Component({
  selector: 'cw-case-header',
  imports: [DsBadge, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let c = caseSummary();
    <a routerLink=".." class="cw-header__back">← Queue</a>
    <div class="cw-header__row">
      <h2 class="cw-header__title">
        {{ title() }} <span class="cw-header__id">{{ c.caseId }}</span>
      </h2>
      <ds-badge [tone]="statusTone()">{{ c.status.replace('_', ' ') }}</ds-badge>
      <ds-badge [tone]="priorityTone()">{{ c.priority }}</ds-badge>
    </div>
    <dl class="cw-header__facts">
      <div>
        <dt>{{ c.subject.kind === 'PARTNER' ? 'Partner' : 'Subscriber' }}</dt>
        <dd>{{ c.subject.displayName }} · {{ c.subject.id }}</dd>
      </div>
      @if (c.subject.msisdn) {
        <div>
          <dt>Phone</dt>
          <dd>{{ c.subject.msisdn }}</dd>
        </div>
      }
      <div>
        <dt>Type</dt>
        <dd>{{ c.caseType }}</dd>
      </div>
      <div>
        <dt>Assignee</dt>
        <dd>{{ c.assignee?.displayName ?? 'Unassigned' }}</dd>
      </div>
      <div>
        <dt>Opened</dt>
        <dd>{{ c.openedAt | date: 'medium' : 'UTC' }}</dd>
      </div>
      @if (c.dueAt) {
        <div>
          <dt>Due</dt>
          <dd>{{ c.dueAt | date: 'medium' : 'UTC' }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: var(--ds-space-4);
    }
    .cw-header__back {
      font-size: var(--ds-font-size-sm);
      color: var(--ds-color-text-muted);
      text-decoration: none;
    }
    .cw-header__row {
      display: flex;
      align-items: center;
      gap: var(--ds-space-2);
      margin: var(--ds-space-2) 0;
      flex-wrap: wrap;
    }
    .cw-header__title {
      font-size: var(--ds-font-size-xl);
      margin: 0 var(--ds-space-2) 0 0;
    }
    .cw-header__id {
      font-family: var(--ds-font-family-mono);
      font-weight: 400;
      color: var(--ds-color-text-muted);
    }
    .cw-header__facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ds-space-2) var(--ds-space-5);
      margin: 0;
    }
    .cw-header__facts dt {
      font-size: var(--ds-font-size-sm);
      color: var(--ds-color-text-muted);
    }
    .cw-header__facts dd {
      margin: 0;
    }
  `,
})
export class CaseHeaderComponent {
  readonly caseSummary = input.required<CaseSummary>();
  readonly title = input('Case');
  protected readonly statusTone = computed(() => STATUS_TONE[this.caseSummary().status]);
  protected readonly priorityTone = computed(() => PRIORITY_TONE[this.caseSummary().priority]);
}

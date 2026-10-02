/**
 * @file Customer full profile at /customer-full-profile/:profileId on the shared 360 layout (ADR-0024).
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsEmptyState, DsSkeleton } from '@org/design-system';
import { CaseEvent, CaseEventBus, type CaseSummary, type CustomerSummary, type Page } from '@platform/contracts';
import { formatCurrency } from '@platform/utils';
import {
  CaseListComponent,
  L360SectionDirective,
  Layout360Component,
  type Kpi360,
  type Profile360,
} from '@platform/layout-360';
import { of } from 'rxjs';
import { SUBSCRIBER_VIEW_SECTIONS } from './subscriber-view.sections';

/** Customer full profile at /customer-full-profile/:profileId on the shared 360 layout (ADR-0024). */
@Component({
  selector: 'subscriberview-profile',
  imports: [Layout360Component, L360SectionDirective, CaseListComponent, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (summary.isLoading() && !summary.hasValue()) {
      <ds-skeleton variant="panel" />
    } @else if (summary.value(); as s) {
      <l360-layout
        [profile]="profile()!"
        [kpis]="kpis()"
        [sections]="sections"
        [panelInputs]="{ accountId: s.customerId }"
      >
        <ng-template l360Section="open-cases">
          <l360-case-list [cases]="openCases()" label="Open cases" (openCase)="openCase($event)" />
        </ng-template>
        <ng-template l360Section="linked-partners">
          <ul class="links">
            @for (p of s.relatedSubjectIds; track p) {
              <li>
                <button type="button" class="links__item" (click)="openPartner(p)">{{ p }} · Agent full profile</button>
              </li>
            } @empty {
              <li class="links__none">No linked agents.</li>
            }
          </ul>
        </ng-template>
      </l360-layout>
    } @else {
      <ds-empty-state
        icon="empty"
        heading="Subscriber not found"
        [message]="'No subscriber with id ' + profileId() + '.'"
      />
    }
  `,
  styles: `
    .links {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--ds-space-2);
    }
    .links__item {
      border: 0;
      background: none;
      padding: 0;
      color: var(--ds-color-primary);
      cursor: pointer;
      text-decoration: underline;
      font-family: var(--ds-font-family-mono);
    }
    .links__none {
      color: var(--ds-color-text-muted);
    }
  `,
})
export class SubscriberViewProfileComponent {
  /** Route param :profileId (withComponentInputBinding). */
  readonly profileId = input.required<string>();
  protected readonly sections = SUBSCRIBER_VIEW_SECTIONS;
  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  private readonly date = new DatePipe('en-US');

  protected readonly summary = rxResource({
    params: () => this.profileId(),
    stream: ({ params }) => this.http.get<CustomerSummary>(`/api/customers/${encodeURIComponent(params)}`),
  });
  private readonly cases = rxResource({
    params: () => this.summary.value()?.customerId,
    stream: ({ params }) =>
      params ? this.http.get<Page<CaseSummary>>('/api/cases', { params: { subjects: params, size: 50 } }) : of(null),
  });
  protected readonly openCases = computed(() => (this.cases.value()?.items ?? []).filter((c) => c.status !== 'CLOSED'));

  protected readonly profile = computed<Profile360 | null>(() => {
    const s = this.summary.value();
    if (!s) return null;
    return {
      title: s.displayName,
      subtitle: `Customer · ${s.customerId}`,
      badges: [
        { label: 'Customer', tone: 'info' },
        { label: s.status.replace('_', ' '), tone: s.status === 'ACTIVE' ? 'success' : 'warning' },
        ...(s.segment ? [{ label: s.segment }] : []),
      ],
      facts: [
        ...(s.contact ? [{ label: 'Phone', value: s.contact }] : []),
        ...(s.plan ? [{ label: 'Plan', value: s.plan }] : []),
        ...(s.since ? [{ label: 'Customer since', value: this.date.transform(s.since, 'MMM y', 'UTC') ?? '' }] : []),
      ],
    };
  });

  protected readonly kpis = computed<Kpi360[]>(() => {
    const s = this.summary.value();
    if (!s) return [];
    // Same cases as the "Open cases" panel: about this subscriber (linked dealers' cases are on Agent full profile).
    const open = this.openCases().length;
    return [
      { label: 'Open cases', value: String(open), tone: open ? 'danger' : 'good' },
      {
        label: 'Balance',
        value: s.balance === undefined ? '–' : formatCurrency(s.balance, s.currency ?? 'USD'),
        tone: (s.balance ?? 0) > 500 ? 'warning' : 'neutral',
      },
      { label: 'Lines', value: String(s.lineCount ?? 0) },
      { label: 'Linked agents', value: String(s.relatedSubjectIds.length) },
    ];
  });

  protected openCase(c: CaseSummary): void {
    this.events.emit(CaseEvent.OPEN_CASE, { caseId: c.caseId, domain: c.domain });
  }

  protected openPartner(partnerId: string): void {
    this.events.emit(CaseEvent.OPEN_PARTNER_360, { partnerId });
  }
}

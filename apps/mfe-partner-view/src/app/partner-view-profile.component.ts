/**
 * @file Agent full profile at /agent-full-profile/:profileId: dealer profile, activations, quality metrics (ADR-0024).
 */
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton, type DsBadgeTone } from '@org/design-system';
import {
  CaseEvent,
  CaseEventBus,
  type CaseSummary,
  type Page,
  type PartnerFinding,
  type PartnerProfile,
} from '@platform/contracts';
import {
  CaseListComponent,
  L360SectionDirective,
  Layout360Component,
  type Kpi360,
  type Profile360,
} from '@platform/layout-360';
import { of } from 'rxjs';
import { PARTNER_VIEW_SECTIONS } from './partner-view.sections';

const TONE: Record<PartnerFinding['severity'], DsBadgeTone> = { LOW: 'neutral', MEDIUM: 'warning', HIGH: 'danger' };

/** Agent full profile at /agent-full-profile/:profileId: dealer profile, activations, quality metrics (ADR-0024). */
@Component({
  selector: 'partnerview-profile',
  imports: [Layout360Component, L360SectionDirective, CaseListComponent, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (partner.isLoading() && !partner.hasValue()) {
      <ds-skeleton variant="panel" />
    } @else if (partner.value(); as p) {
      <l360-layout
        [profile]="profile()!"
        [kpis]="kpis()"
        [sections]="sections"
        [panelInputs]="{ partnerId: p.partnerId }"
      >
        <ng-template l360Section="findings">
          <ul class="pv__list">
            @for (f of p.findings; track f.findingId) {
              <li class="pv__finding">
                <ds-badge [tone]="tone(f)">{{ f.severity }}</ds-badge>
                <div>
                  <strong>{{ f.title }}</strong>
                  <div class="pv__muted">{{ f.detail }}</div>
                </div>
              </li>
            } @empty {
              <li class="pv__muted">No findings.</li>
            }
          </ul>
        </ng-template>
        <ng-template l360Section="open-cases">
          <l360-case-list [cases]="openCases()" label="Open agent cases" (openCase)="openCase($event)" />
        </ng-template>
        <ng-template l360Section="linked-subscribers">
          <ul class="pv__list pv__list--row">
            @for (a of p.linkedAccountIds; track a) {
              <li>
                <button type="button" class="pv__link" (click)="openSubscriber(a)">
                  {{ a }} · Customer full profile
                </button>
              </li>
            } @empty {
              <li class="pv__muted">No linked customers.</li>
            }
          </ul>
        </ng-template>
      </l360-layout>
    } @else {
      <ds-empty-state icon="empty" heading="Partner not found" [message]="'No partner with id ' + profileId() + '.'" />
    }
  `,
  styles: `
    .pv__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--ds-space-3);
    }
    .pv__list--row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ds-space-4);
    }
    .pv__finding {
      display: flex;
      gap: var(--ds-space-3);
      align-items: flex-start;
    }
    .pv__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    .pv__link {
      border: 0;
      background: none;
      padding: 0;
      color: var(--ds-color-primary);
      cursor: pointer;
      text-decoration: underline;
      font-family: var(--ds-font-family-mono);
    }
  `,
})
export class PartnerViewProfileComponent {
  /** Route param :profileId (withComponentInputBinding). */
  readonly profileId = input.required<string>();
  protected readonly sections = PARTNER_VIEW_SECTIONS;
  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);

  protected readonly partner = rxResource({
    params: () => this.profileId(),
    stream: ({ params }) => this.http.get<PartnerProfile>(`/api/partners/${encodeURIComponent(params)}`),
  });
  private readonly cases = rxResource({
    params: () => this.partner.value()?.partnerId,
    stream: ({ params }) =>
      params ? this.http.get<Page<CaseSummary>>('/api/cases', { params: { subjects: params, size: 50 } }) : of(null),
  });
  protected readonly openCases = computed(() => (this.cases.value()?.items ?? []).filter((c) => c.status !== 'CLOSED'));

  protected readonly profile = computed<Profile360 | null>(() => {
    const p = this.partner.value();
    return p
      ? {
          title: p.name,
          subtitle: `Agent · ${p.partnerId}`,
          badges: [{ label: 'Agent', tone: 'info' }, { label: p.tier }],
          facts: [{ label: 'Region', value: p.region }],
        }
      : null;
  });

  protected readonly kpis = computed<Kpi360[]>(() => {
    const p = this.partner.value();
    if (!p) return [];
    return [
      { label: 'Activations (30 days)', value: String(p.activations30d) },
      { label: 'Quality score', value: String(p.qualityScore), tone: p.qualityScore < 70 ? 'danger' : 'good' },
      { label: 'Chargeback rate', value: `${p.chargebackRate}%`, tone: p.chargebackRate > 3 ? 'danger' : 'good' },
      {
        label: 'Open cases',
        value: String(this.openCases().length),
        tone: this.openCases().length ? 'warning' : 'good',
      },
    ];
  });

  protected tone(f: PartnerFinding): DsBadgeTone {
    return TONE[f.severity];
  }

  protected openCase(c: CaseSummary): void {
    this.events.emit(CaseEvent.OPEN_CASE, { caseId: c.caseId, domain: c.domain });
  }

  protected openSubscriber(accountId: string): void {
    this.events.emit(CaseEvent.OPEN_SUBSCRIBER_360, { accountId });
  }
}

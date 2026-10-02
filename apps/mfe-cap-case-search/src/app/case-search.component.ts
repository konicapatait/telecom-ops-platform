/**
 * @file Exposed as './CaseSearch': an embedded panel (not a case tab).
 */
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSearchField, DsSkeleton } from '@org/design-system';
import { CaseEvent, CaseEventBus, type CaseDomain, type CaseSummary, type Page } from '@platform/contracts';
import { of } from 'rxjs';

/**
 * Exposed as './CaseSearch': an embedded panel (not a case tab). Finds cases across domains by case id,
 * account / partner id, name or phone number. It never navigates itself: choosing a result emits
 * CaseEvent.OPEN_CASE and the shell routes to the owning domain (ADR-0021).
 */
@Component({
  selector: 'casesearch-case-search',
  imports: [DatePipe, DsSearchField, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ds-search-field
      label="Search cases"
      placeholder="Case id, account, name or phone number"
      (search)="term.set($event.trim())"
    />
    @if (term()) {
      @if (results.isLoading()) {
        <ds-skeleton />
      } @else if (results.error()) {
        <ds-empty-state icon="warning" heading="Search failed" actionLabel="Retry" (action)="results.reload()" />
      } @else {
        <ul class="cs__results" [attr.aria-label]="'Results for ' + term()">
          @for (c of results.value()?.items; track c.caseId) {
            <li>
              <button type="button" class="cs__hit" (click)="open(c)">
                <span class="cs__id">{{ c.caseId }}</span>
                <span>{{ c.subject.displayName }}</span>
                <ds-badge>{{ c.domain.replace('_', ' ') }}</ds-badge>
                <span class="cs__muted"
                  >{{ c.status.replace('_', ' ') }} · {{ c.openedAt | date: 'MMM d' : 'UTC' }}</span
                >
              </button>
            </li>
          } @empty {
            <li class="cs__muted">No cases match "{{ term() }}".</li>
          }
        </ul>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .cs__results {
      list-style: none;
      padding: 0;
      margin: var(--ds-space-3) 0 0;
      display: grid;
      gap: var(--ds-space-1);
    }
    .cs__hit {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--ds-space-3);
      padding: var(--ds-space-2) var(--ds-space-3);
      background: var(--ds-color-surface);
      border: 1px solid var(--ds-color-border);
      border-radius: var(--ds-radius-sm);
      cursor: pointer;
      text-align: left;
    }
    .cs__hit:hover {
      border-color: var(--ds-color-primary);
    }
    .cs__id {
      font-family: var(--ds-font-family-mono);
      color: var(--ds-color-primary);
    }
    .cs__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
      margin-left: auto;
    }
  `,
})
export class CaseSearchComponent {
  /** Optional: limit results to one domain (e.g. inside a domain's queue). */
  readonly domain = input<CaseDomain>();

  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  protected readonly term = signal('');

  protected readonly results = rxResource({
    params: () => ({ q: this.term(), domain: this.domain() }),
    stream: ({ params }) =>
      params.q
        ? this.http.get<Page<CaseSummary>>('/api/cases', {
            params: { q: params.q, size: 10, ...(params.domain ? { domain: params.domain } : {}) },
          })
        : of<Page<CaseSummary>>({ items: [], total: 0, page: 0, size: 10 }),
  });

  protected open(c: CaseSummary): void {
    this.events.emit(CaseEvent.OPEN_CASE, { caseId: c.caseId, domain: c.domain });
  }
}

export default CaseSearchComponent;

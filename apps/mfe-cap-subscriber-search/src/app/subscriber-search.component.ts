/**
 * @file Exposed as './SubscriberSearch': the global search in the shell header (Phase 4).
 */
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge } from '@org/design-system';
import { CaseEvent, CaseEventBus, type CustomerSummary } from '@platform/contracts';
import { of, switchMap, timer } from 'rxjs';

/**
 * Exposed as './SubscriberSearch': the global search in the shell header (Phase 4). Finds subscribers by account
 * number, phone number or name (and partners by id/name), then asks the shell to open their 360 view
 * (OPEN_SUBSCRIBER_360 / OPEN_PARTNER_360). It never navigates itself (ADR-0021).
 */
@Component({
  selector: 'subscribersearch-subscriber-search',
  imports: [DsBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form role="search" class="ss" (submit)="$event.preventDefault(); openFirst()">
      <label class="ss__label" for="global-subscriber-search">Search by account number or phone number</label>
      <input
        id="global-subscriber-search"
        type="search"
        autocomplete="off"
        placeholder="Search account, phone or name"
        [value]="term()"
        (input)="term.set($any($event.target).value)"
        (keydown.escape)="term.set('')"
        aria-controls="global-subscriber-results"
      />
      @if (term().trim().length >= 2) {
        <ul class="ss__results" id="global-subscriber-results" aria-label="Search results">
          @for (r of results.value() ?? []; track r.customerId) {
            <li>
              <button type="button" class="ss__hit" (click)="open(r)">
                <strong>{{ r.displayName }}</strong>
                <span class="ss__id">{{ r.customerId }}</span>
                <ds-badge>{{ r.kind === 'PARTNER' ? 'Partner' : 'Subscriber' }}</ds-badge>
                @if (r.contact) {
                  <span class="ss__muted">{{ r.contact }}</span>
                }
              </button>
            </li>
          } @empty {
            <li class="ss__muted ss__none">{{ results.isLoading() ? 'Searching…' : 'No match' }}</li>
          }
        </ul>
      }
    </form>
  `,
  styles: `
    :host {
      display: block;
      flex: 1;
      max-width: 520px;
      position: relative;
    }
    .ss__label {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    input {
      width: 100%;
      height: 34px;
      padding: 0 var(--ds-space-3);
      border: 1px solid var(--ds-color-border);
      border-radius: var(--ds-radius-md);
      background: var(--ds-color-surface-sunken);
    }
    .ss__results {
      position: absolute;
      z-index: 50;
      top: 38px;
      left: 0;
      right: 0;
      list-style: none;
      margin: 0;
      padding: var(--ds-space-1);
      background: var(--ds-color-surface);
      border: 1px solid var(--ds-color-border);
      border-radius: var(--ds-radius-md);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.12);
    }
    .ss__hit {
      width: 100%;
      display: flex;
      align-items: center;
      gap: var(--ds-space-2);
      padding: var(--ds-space-2);
      border: 0;
      background: none;
      border-radius: var(--ds-radius-sm);
      cursor: pointer;
      text-align: left;
    }
    .ss__hit:hover,
    .ss__hit:focus-visible {
      background: var(--ds-color-surface-sunken);
    }
    .ss__id {
      font-family: var(--ds-font-family-mono);
      color: var(--ds-color-text-muted);
    }
    .ss__muted {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
      margin-left: auto;
    }
    .ss__none {
      padding: var(--ds-space-2);
    }
  `,
})
export class SubscriberSearchComponent {
  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  protected readonly term = signal('');

  protected readonly results = rxResource({
    params: () => this.term().trim(),
    // Debounced: waits 200 ms after the last keystroke.
    stream: ({ params }) =>
      params.length < 2
        ? of<CustomerSummary[]>([])
        : timer(200).pipe(
            switchMap(() => this.http.get<CustomerSummary[]>('/api/customers', { params: { q: params } })),
          ),
  });

  protected openFirst(): void {
    const first = this.results.value()?.[0];
    if (first) this.open(first);
  }

  protected open(r: CustomerSummary): void {
    this.term.set('');
    if (r.kind === 'PARTNER') this.events.emit(CaseEvent.OPEN_PARTNER_360, { partnerId: r.customerId });
    else this.events.emit(CaseEvent.OPEN_SUBSCRIBER_360, { accountId: r.customerId });
  }
}

export default SubscriberSearchComponent;

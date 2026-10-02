/**
 * @file Exposed as './AccountView': account → lines → devices.
 */
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { DsBadge, DsEmptyState, DsSkeleton, type DsBadgeTone } from '@org/design-system';
import type { Account, CaseType, ServiceLine } from '@platform/contracts';
import { formatCurrency } from '@platform/utils';

const LINE_TONE: Record<ServiceLine['status'], DsBadgeTone> = {
  ACTIVE: 'success',
  SUSPENDED: 'danger',
  PORTED_OUT: 'neutral',
  CANCELLED: 'neutral',
};

/**
 * Exposed as './AccountView': account → lines → devices.
 * Inputs: EITHER CaseCapabilityInputs (case tab: the account behind the case; partner cases say they have none)
 * OR SubscriberCapabilityInputs (Customer full profile panel: `accountId`) (ADR-0024).
 */
@Component({
  selector: 'accountview-account-view',
  imports: [DatePipe, DsBadge, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (account.isLoading() && !account.hasValue()) {
      <ds-skeleton variant="panel" />
    } @else if (status() === 404) {
      <ds-empty-state
        icon="empty"
        heading="No subscriber account"
        message="This case is not about a subscriber account."
      />
    } @else if (status() === 403) {
      <ds-empty-state
        icon="lock"
        heading="No access to account details"
        message="You need the case:account:view entitlement."
      />
    } @else if (account.error()) {
      <ds-empty-state
        icon="warning"
        heading="Account could not be loaded"
        actionLabel="Retry"
        (action)="account.reload()"
      />
    } @else if (account.value(); as a) {
      <section class="acc" [attr.aria-label]="'Account ' + a.accountId">
        <div class="acc__head">
          <h2 class="acc__name">{{ a.holder }}</h2>
          <ds-badge [tone]="a.status === 'ACTIVE' ? 'success' : 'warning'">{{ a.status.replace('_', ' ') }}</ds-badge>
        </div>
        <dl class="acc__facts">
          <div>
            <dt>Account</dt>
            <dd>{{ a.accountId }}</dd>
          </div>
          <div>
            <dt>Segment</dt>
            <dd>{{ a.segment }}</dd>
          </div>
          <div>
            <dt>Customer since</dt>
            <dd>{{ a.customerSince | date: 'MMM y' : 'UTC' }}</dd>
          </div>
          <div>
            <dt>Balance</dt>
            <dd>{{ money(a) }}</dd>
          </div>
          <div>
            <dt>Billing address</dt>
            <dd>{{ a.billingAddress }}</dd>
          </div>
        </dl>
        <table class="acc__lines">
          <caption>
            Lines ({{
              a.lines.length
            }})
          </caption>
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Plan</th>
              <th scope="col">Status</th>
              <th scope="col">Device</th>
              <th scope="col">SIM (ICCID)</th>
              <th scope="col">Activated</th>
            </tr>
          </thead>
          <tbody>
            @for (l of a.lines; track l.msisdn) {
              <tr>
                <td class="acc__msisdn">{{ l.msisdn }}</td>
                <td>{{ l.plan }}</td>
                <td>
                  <ds-badge [tone]="tone(l)">{{ l.status.replace('_', ' ') }}</ds-badge>
                </td>
                <td>
                  @if (l.device; as d) {
                    {{ d.make }} {{ d.model }} <span class="acc__muted">IMEI {{ d.imei }}</span>
                  } @else {
                    –
                  }
                </td>
                <td class="acc__mono">{{ l.simIccid }}</td>
                <td>{{ l.activatedAt | date: 'MMM d, y, HH:mm' : 'UTC' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    }
  `,
  styles: `
    .acc__head {
      display: flex;
      align-items: center;
      gap: var(--ds-space-2);
    }
    .acc__name {
      margin: 0;
      font-size: var(--ds-font-size-xl);
    }
    .acc__facts {
      display: flex;
      flex-wrap: wrap;
      gap: var(--ds-space-2) var(--ds-space-5);
      margin: var(--ds-space-3) 0;
    }
    dt {
      font-size: var(--ds-font-size-sm);
      color: var(--ds-color-text-muted);
    }
    dd {
      margin: 0;
    }
    .acc__lines {
      width: 100%;
      border-collapse: collapse;
      background: var(--ds-color-surface);
      border: 1px solid var(--ds-color-border);
    }
    caption {
      text-align: left;
      padding: var(--ds-space-2) 0;
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    th,
    td {
      text-align: left;
      padding: var(--ds-space-2) var(--ds-space-3);
      border-bottom: 1px solid var(--ds-color-border);
      vertical-align: top;
    }
    th {
      font-size: var(--ds-font-size-sm);
      color: var(--ds-color-text-muted);
    }
    .acc__muted {
      display: block;
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
    }
    .acc__mono,
    .acc__msisdn {
      font-family: var(--ds-font-family-mono);
      white-space: nowrap;
    }
  `,
})
export class AccountViewComponent {
  readonly caseId = input<string>();
  readonly caseType = input<CaseType>();
  readonly accountId = input<string>();

  private readonly http = inject(HttpClient);
  protected readonly account = rxResource({
    params: () => {
      const accountId = this.accountId();
      const caseId = this.caseId();
      if (accountId) return `/api/accounts/${encodeURIComponent(accountId)}`;
      return caseId ? `/api/cases/${encodeURIComponent(caseId)}/account` : undefined;
    },
    stream: ({ params }) => this.http.get<Account>(params),
  });
  protected readonly status = computed(() => (this.account.error() as HttpErrorResponse | undefined)?.status);

  protected money(a: Account): string {
    return formatCurrency(a.balance, a.currency);
  }

  protected tone(l: ServiceLine): DsBadgeTone {
    return LINE_TONE[l.status];
  }
}

export default AccountViewComponent;

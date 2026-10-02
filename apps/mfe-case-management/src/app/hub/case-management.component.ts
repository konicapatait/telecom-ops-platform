/**
 * @file The Case management page (ADR-0022): customer overview on top, one tab per case-domain remote below.
 */
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { DsBadge } from '@org/design-system';
import { CaseContextStore, CustomerContextStore, type CustomerSummary } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { catchError, filter, of } from 'rxjs';
import { CASE_MANAGEMENT_TABS, type CaseManagementTab } from '../case-management.tabs';
import { CustomerOverviewComponent } from '../overview/customer-overview.component';

/**
 * The Case management page (ADR-0022): customer overview on top, one tab per case-domain remote below.
 * - It is the ONE writer of CustomerContextStore; every domain's queue filters by it.
 * - Tabs are router-driven (deep links, back button). Each tab remembers its last URL (e.g. an open case),
 *   so switching away and back returns to where the agent was.
 */
@Component({
  selector: 'casemanagement-hub',
  imports: [RouterOutlet, DsBadge, CustomerOverviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-management.component.html',
  styleUrl: './case-management.component.css',
})
export class CaseManagementComponent {
  /** From `resolve: { customer }` on /customers/:customerId; undefined on the unfocused page. */
  readonly customer = input<CustomerSummary | null>();

  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly entitlements = inject(EntitlementsService);
  private readonly customerContext = inject(CustomerContextStore);
  private readonly activeCase = inject(CaseContextStore).activeCase;

  protected readonly tabs = computed(() => CASE_MANAGEMENT_TABS.filter((t) => this.entitlements.has(t.entitlement)));

  /** No customer chosen but a case is open: show that case's subject (not used for filtering). */
  private readonly caseSubject = rxResource({
    params: () => (this.customer() ? undefined : this.activeCase()?.subject.id),
    stream: ({ params }) =>
      this.http.get<CustomerSummary>(`/api/customers/${encodeURIComponent(params)}`).pipe(catchError(() => of(null))),
  });
  protected readonly overviewCustomer = computed(
    () => this.customer() ?? (this.activeCase() ? this.caseSubject.value() : null) ?? null,
  );
  protected readonly overviewMode = computed(() =>
    this.customer() ? 'selected' : this.overviewCustomer() ? 'from-case' : 'none',
  );

  /** '/case-management' or '/case-management/customers/ACC-1' */
  private readonly base = () => this.router.createUrlTree(['.'], { relativeTo: this.route }).toString().split('?')[0];
  private readonly url = signal(this.router.url);
  private readonly lastUrlByTab = signal<Record<string, string>>({});

  constructor() {
    effect(() => {
      const c = this.customer();
      if (c) this.customerContext.set(c);
      else this.customerContext.clear();
    });
    inject(DestroyRef).onDestroy(() => this.customerContext.clear());

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.url.set(e.urlAfterRedirects);
        const tab = this.tabOf(e.urlAfterRedirects);
        if (tab) this.lastUrlByTab.update((m) => ({ ...m, [`${this.base()}|${tab.id}`]: e.urlAfterRedirects }));
      });
  }

  protected href(t: CaseManagementTab): string {
    return this.lastUrlByTab()[`${this.base()}|${t.id}`] ?? `${this.base()}/${t.path}`;
  }

  protected isActive(t: CaseManagementTab): boolean {
    return this.tabOf(this.url())?.id === t.id;
  }

  protected count(t: CaseManagementTab): number {
    const open = this.customer()?.openCasesByDomain ?? {};
    return t.domains.reduce((n, d) => n + (open[d.domain] ?? 0), 0);
  }

  protected go(event: MouseEvent, t: CaseManagementTab): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return; // let the browser open a new tab
    event.preventDefault();
    void this.router.navigateByUrl(this.href(t));
  }

  /** Focus on a customer, staying on the current tab's list. */
  protected focus(customerId: string): void {
    const tab = this.tabOf(this.url()) ?? this.tabs()[0];
    void this.router.navigateByUrl(`${this.rootUrl()}/customers/${encodeURIComponent(customerId)}/${tab?.path ?? ''}`);
  }

  protected unfocus(): void {
    const tab = this.tabOf(this.url());
    void this.router.navigateByUrl(`${this.rootUrl()}/${tab?.path ?? ''}`);
  }

  private rootUrl(): string {
    return this.base().replace(/\/customers\/[^/]+$/, '');
  }

  private tabOf(url: string): CaseManagementTab | undefined {
    const rest = url.split('?')[0].slice(this.base().length);
    return this.tabs().find((t) => rest === `/${t.path}` || rest.startsWith(`/${t.path}/`));
  }
}

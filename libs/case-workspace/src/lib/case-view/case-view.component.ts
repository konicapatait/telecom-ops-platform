/**
 * @file The case screen: four configured tabs (ADR-0023), lazy + keep-alive, preload, ?tab= deep links, CaseContextStore writer (ADR-0017).
 */
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { DsEmptyState, DsTab, DsTabs } from '@org/design-system';
import {
  CaseContextStore,
  CaseEvent,
  CaseEventBus,
  type CaseSummary,
  type CaseTabDefinition,
} from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { preloadRemoteModule } from '@platform/mf-manifest';
import { CaseHeaderComponent } from '../case-header/case-header.component';
import { CASE_DOMAIN_CONFIG } from '../domain/case-domain';
import { CapabilityTabHostComponent } from '../tab-host/capability-tab-host.component';

/**
 * The case screen (ADR-0004, ADR-0005, ADR-0017):
 * - tabs come from the domain's CaseDomainConfig, filtered by entitlements
 * - each tab's code is preloaded when the case resolves (flag case.tabPreload), instantiated on first open, then kept alive
 * - a different case resets the opened tabs; the selected tab is mirrored in ?tab= for deep links
 * - it is the ONE writer of CaseContextStore
 */
@Component({
  selector: 'cw-case-view',
  imports: [CaseHeaderComponent, CapabilityTabHostComponent, DsTabs, DsTab, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-view.component.html',
  styleUrl: './case-view.component.css',
})
export class CaseViewComponent {
  /** From `resolve: { caseSummary: caseResolver }` via withComponentInputBinding. */
  readonly caseSummary = input<CaseSummary | null>(null);
  /** From `?tab=` via withComponentInputBinding. */
  readonly tab = input<string>();

  protected readonly config = inject(CASE_DOMAIN_CONFIG);
  private readonly entitlements = inject(EntitlementsService);
  private readonly caseContext = inject(CaseContextStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /**
   * The domain's tabs plus its decision tab (CaseDomainConfig.resolution), placed by `order` (ADR-0023).
   * Entitlement-filtered; the decision tab usually has none, because viewing a decision is open to case viewers
   * and the capability itself gates recording one.
   */
  protected readonly visibleTabs = computed<CaseTabDefinition[]>(() =>
    [...this.config.tabs, this.config.resolution]
      .filter((t) => this.entitlements.has(t.entitlement))
      .sort((a, b) => a.order - b.order),
  );
  /** CaseResolutionInputs, passed ONLY to the decision tab (ADR-0020). */
  private readonly resolutionInputs = { resolutionCodes: this.config.resolutionCodes };
  private readonly noInputs = {};
  /** The resolved case, updated locally when this case is resolved (status → CLOSED) without refetching. */
  protected readonly current = linkedSignal(() => this.caseSummary());
  protected readonly caseId = computed(() => this.caseSummary()?.caseId ?? '');

  protected readonly selected = linkedSignal(() => {
    const index = this.visibleTabs().findIndex((t) => t.id === this.tab());
    return index >= 0 ? index : 0;
  });

  /**
   * Tabs created so far. Reset ONLY when the case changes, so the previous case's components are destroyed.
   * `untracked` matters: a linkedSignal recomputes on every signal its computation reads, and reading
   * `selected()` here would reset (destroy) the kept-alive tabs on every tab switch.
   */
  protected readonly opened = linkedSignal<string, ReadonlySet<string>>({
    source: this.caseId,
    computation: () => untracked(() => new Set([this.visibleTabs()[this.selected()]?.id].filter(Boolean) as string[])),
  });

  constructor() {
    effect(() => {
      const c = this.current();
      if (c) this.caseContext.set(c);
    });
    inject(CaseEventBus)
      .on(CaseEvent.CASE_RESOLVED)
      .pipe(
        filter((e) => e.caseId === this.caseId()),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.current.update((c) => (c ? { ...c, status: 'CLOSED' } : c)));
    effect(() => {
      if (!this.caseSummary() || !this.entitlements.isEnabled('case.tabPreload')) return;
      // Download code only; nothing is instantiated until the tab is opened.
      for (const t of [...this.visibleTabs(), this.config.resolution])
        void preloadRemoteModule(t.remote, t.exposedModule);
    });
    inject(DestroyRef).onDestroy(() => this.caseContext.clear());
  }

  protected inputsFor(tab: CaseTabDefinition): Readonly<Record<string, unknown>> {
    return tab.id === this.config.resolution.id ? this.resolutionInputs : this.noInputs;
  }

  protected select(index: number): void {
    const tab = this.visibleTabs()[index];
    if (!tab) return;
    this.selected.set(index);
    this.opened.update((s) => new Set([...s, tab.id]));
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: tab.id }, replaceUrl: true });
  }
}

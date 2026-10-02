import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CaseContextStore, type CaseDomainConfig, type CaseSummary } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { provideCaseDomain } from '../domain/case-domain';
import { CapabilityTabHostComponent } from '../tab-host/capability-tab-host.component';
import { CaseViewComponent } from './case-view.component';

/** Stand-in for the federated tab host: records which tabs were created. */
@Component({
  selector: 'cw-capability-tab-host',
  template: `{{ tab().id }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class FakeTabHost {
  readonly tab = input.required<{ id: string }>();
  readonly caseId = input<string>();
  readonly caseType = input<string>();
  readonly inputs = input<Record<string, unknown>>();
}

// Layout libs may not depend on @platform/mocks (ADR-0014), so the spec carries its own case.
const CASE: CaseSummary = {
  caseId: 'FRD-2026-000142',
  domain: 'FRAUD',
  caseType: 'FRAUD_SIM_SWAP',
  status: 'IN_REVIEW',
  priority: 'CRITICAL',
  subject: { id: 'ACC-884210', displayName: 'Maria Delgado', kind: 'SUBSCRIBER' },
  openedAt: '2026-09-21T14:05:00Z',
};

const CONFIG = {
  domain: 'FRAUD',
  title: 'Fraud case',
  tabs: [
    { id: 'overview', label: 'Overview', remote: 'mfe-fraud', exposedModule: './FraudOverview', order: 0 },
    {
      id: 'usage',
      label: 'Usage',
      remote: 'mfe-cap-usage-billing',
      exposedModule: './UsageBilling',
      order: 1,
      entitlement: 'case:usage:view',
    },
    {
      id: 'audit',
      label: 'Audit',
      remote: 'mfe-cap-audit-trail',
      exposedModule: './AuditTrail',
      order: 2,
      entitlement: 'case:audit:view',
    },
  ],
  resolution: {
    id: 'decision',
    label: 'Case decision',
    remote: 'mfe-cap-case-resolution',
    exposedModule: './CaseResolution',
    order: -1,
  },
  resolutionCodes: [],
} as unknown as CaseDomainConfig;

describe('CaseViewComponent', () => {
  async function render(entitlements: string[], caseSummary: CaseSummary | null = CASE) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideCaseDomain(CONFIG)] }).overrideComponent(
      CaseViewComponent,
      { remove: { imports: [CapabilityTabHostComponent] }, add: { imports: [FakeTabHost] } },
    );
    TestBed.inject(EntitlementsService).set({ entitlements, featureFlags: {} });
    const fixture = TestBed.createComponent(CaseViewComponent);
    fixture.componentRef.setInput('caseSummary', caseSummary);
    await fixture.whenStable();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }
  /** @angular/aria tabs select on pointerdown (not click). */
  const press = (tab: Element) => tab.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  const hosts = (el: HTMLElement) =>
    [...el.querySelectorAll('cw-capability-tab-host')].map((h) => h.textContent?.trim());

  it('shows the decision tab first (by order) plus only the entitled domain tabs', async () => {
    const { el } = await render(['case:usage:view']);
    expect([...el.querySelectorAll('[role=tab]')].map((t) => t.textContent?.trim())).toEqual([
      'Case decision',
      'Overview',
      'Usage',
    ]);
    expect(el.querySelector('aside')).toBeNull();
  });

  it('creates a tab on first open and keeps it alive after switching away', async () => {
    const { fixture, el } = await render(['case:usage:view', 'case:audit:view']);
    expect(hosts(el)).toEqual(['decision']);
    press(el.querySelectorAll('[role=tab]')[2]);
    await fixture.whenStable();
    press(el.querySelectorAll('[role=tab]')[0]);
    await fixture.whenStable();
    expect(hosts(el)).toEqual(['decision', 'usage']);
  });

  it('writes the active case to CaseContextStore and clears it on destroy', async () => {
    const { fixture } = await render([]);
    const store = TestBed.inject(CaseContextStore);
    expect(store.activeCaseId()).toBe('FRD-2026-000142');
    fixture.destroy();
    expect(store.activeCaseId()).toBeNull();
  });

  it('renders "Case not found" when the resolver returns null', async () => {
    const { el } = await render([], null);
    expect(el.textContent).toContain('Case not found');
  });
});

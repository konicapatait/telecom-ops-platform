import routes from './case-management.routes';
import { CASE_MANAGEMENT_TABS, tabPathFor } from './case-management.tabs';
import { CaseManagementComponent } from './hub/case-management.component';
import { DomainTabUnavailableComponent } from './hub/domain-tab-unavailable.component';

describe('mfe-case-management routes', () => {
  it('serves the hub with and without a focused customer, plus the open-case resolver', () => {
    expect(routes.map((r) => r.path)).toEqual(['cases/:caseId', 'customers/:customerId', '']);
    expect(routes[1].component).toBe(CaseManagementComponent);
    expect(routes[1].resolve?.['customer']).toBeDefined();
    expect(routes[2].component).toBe(CaseManagementComponent);
  });

  it('gives every tab a guarded remote route and an in-tab fallback', () => {
    const children = routes[2].children ?? [];
    for (const t of CASE_MANAGEMENT_TABS) {
      const pair = children.filter((c) => c.path === t.path);
      expect(pair).toHaveLength(2);
      expect(pair[0].canMatch).toHaveLength(1);
      expect(pair[0].loadChildren).toBeDefined();
      expect(pair[1].component).toBe(DomainTabUnavailableComponent);
    }
  });
});

describe('CASE_MANAGEMENT_TABS', () => {
  it('maps every case domain to exactly one tab path', () => {
    expect(tabPathFor('FRAUD')).toBe('fraud');
    expect(tabPathFor('BILLING_DISPUTE')).toBe('disputes');
    expect(tabPathFor('PARTNER_FIELD_AUDIT')).toBe('partners/field-audit');
    const domains = CASE_MANAGEMENT_TABS.flatMap((t) => t.domains.map((d) => d.domain));
    expect(new Set(domains).size).toBe(domains.length);
    expect(domains).toHaveLength(7);
  });
});

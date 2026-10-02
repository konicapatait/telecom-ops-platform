import routes from './fraud.routes';
import { CaseQueueComponent, CaseViewComponent, CaseWorkspaceLayoutComponent } from '@platform/case-workspace';
import { FRAUD_DOMAIN_CONFIG } from './fraud.config';

describe('mfe-fraud exposed routes', () => {
  it('wraps the section in the shared case layout behind fraud:view', () => {
    expect(routes[0].component).toBe(CaseWorkspaceLayoutComponent);
    expect(routes[0].canActivate?.length).toBe(1);
  });

  it('routes the queue and the case screen', () => {
    const [queue, caseView] = routes[0].children ?? [];
    expect(queue.component).toBe(CaseQueueComponent);
    expect(caseView.path).toBe('cases/:caseId');
    expect(caseView.component).toBe(CaseViewComponent);
    expect(caseView.resolve?.['caseSummary']).toBeDefined();
  });
});

describe('FRAUD_DOMAIN_CONFIG', () => {
  it('has unique, ordered tabs and an entitlement on every capability tab', () => {
    const ids = FRAUD_DOMAIN_CONFIG.tabs.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    const orders = FRAUD_DOMAIN_CONFIG.tabs.map((t) => t.order);
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
    for (const t of FRAUD_DOMAIN_CONFIG.tabs.filter((x) => x.remote !== 'mfe-fraud'))
      expect(t.entitlement).toBeTruthy();
  });
});

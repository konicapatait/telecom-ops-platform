import { CaseQueueComponent, CaseViewComponent, CaseWorkspaceLayoutComponent } from '@platform/case-workspace';
import routes from './billing-disputes.routes';
import { BILLING_DISPUTES_DOMAIN_CONFIG } from './billing-disputes.config';

describe('mfe-billing-disputes exposed routes', () => {
  it('uses the shared case layout, queue and case view (no layout fork)', () => {
    expect(routes[0].component).toBe(CaseWorkspaceLayoutComponent);
    expect(routes[0].canActivate?.length).toBe(1);
    const [queue, caseView] = routes[0].children ?? [];
    expect(queue.component).toBe(CaseQueueComponent);
    expect(caseView.component).toBe(CaseViewComponent);
  });

  it('has unique tab ids for BILLING_DISPUTE', () => {
    const ids = BILLING_DISPUTES_DOMAIN_CONFIG.tabs.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(BILLING_DISPUTES_DOMAIN_CONFIG.domain).toBe('BILLING_DISPUTE');
  });
});

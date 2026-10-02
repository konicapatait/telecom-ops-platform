import { CaseQueueComponent, CaseViewComponent, CaseWorkspaceLayoutComponent } from '@platform/case-workspace';
import routes from './service-assurance.routes';
import { SERVICE_ASSURANCE_DOMAIN_CONFIG } from './service-assurance.config';

describe('mfe-service-assurance exposed routes', () => {
  it('uses the shared case layout, queue and case view (no layout fork)', () => {
    expect(routes[0].component).toBe(CaseWorkspaceLayoutComponent);
    expect(routes[0].canActivate?.length).toBe(1);
    const [queue, caseView] = routes[0].children ?? [];
    expect(queue.component).toBe(CaseQueueComponent);
    expect(caseView.component).toBe(CaseViewComponent);
  });

  it('has unique tab ids for SERVICE_ASSURANCE', () => {
    const ids = SERVICE_ASSURANCE_DOMAIN_CONFIG.tabs.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SERVICE_ASSURANCE_DOMAIN_CONFIG.domain).toBe('SERVICE_ASSURANCE');
  });
});

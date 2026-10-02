import { CaseQueueComponent, CaseViewComponent, CaseWorkspaceLayoutComponent } from '@platform/case-workspace';
import routes from './partner-oversight.routes';
import { PARTNER_JOURNEYS } from './partner-oversight.config';

describe('mfe-partner-oversight exposed routes', () => {
  it('serves three journeys, each on the shared case layout (no layout fork)', () => {
    const journeys = (routes[0].children ?? []).filter((r) => r.component);
    expect(journeys.map((r) => r.path)).toEqual(['onboarding', 'ongoing', 'field-audit']);
    for (const j of journeys) {
      expect(j.component).toBe(CaseWorkspaceLayoutComponent);
      expect(j.children?.[0].component).toBe(CaseQueueComponent);
      expect(j.children?.[1].component).toBe(CaseViewComponent);
    }
  });

  it('gives each journey its own domain and codes', () => {
    expect(PARTNER_JOURNEYS.map((j) => j.config.domain)).toEqual([
      'PARTNER_ONBOARDING',
      'PARTNER_ONGOING',
      'PARTNER_FIELD_AUDIT',
    ]);
    for (const j of PARTNER_JOURNEYS)
      expect(j.config.tabs.map((t) => t.label)).toEqual(['Triggering info', 'Audit log', 'Attachments']);
  });
});

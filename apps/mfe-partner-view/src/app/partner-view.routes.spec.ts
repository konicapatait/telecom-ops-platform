import routes from './partner-view.routes';
import { PartnerViewProfileComponent } from './partner-view-profile.component';
import { PARTNER_VIEW_SECTIONS } from './partner-view.sections';

describe('mfe-partner-view exposed routes', () => {
  it('guards the section and routes a profile by id', () => {
    expect(routes[0].canActivate?.length).toBe(1);
    expect(routes[0].children?.[0]).toMatchObject({ path: ':profileId', component: PartnerViewProfileComponent });
  });

  it('never shows an audit log on a 360 screen (resolved decision)', () => {
    expect(PARTNER_VIEW_SECTIONS.some((s) => s.remote === 'mfe-cap-audit-trail')).toBe(false);
  });
});

import routes from './subscriber-view.routes';
import { SubscriberViewProfileComponent } from './subscriber-view-profile.component';
import { SUBSCRIBER_VIEW_SECTIONS } from './subscriber-view.sections';

describe('mfe-subscriber-view exposed routes', () => {
  it('guards the section and routes a profile by id', () => {
    expect(routes[0].canActivate?.length).toBe(1);
    expect(routes[0].children?.[0]).toMatchObject({ path: ':profileId', component: SubscriberViewProfileComponent });
  });

  it('embeds account and usage by accountId, and never the audit log (resolved decision)', () => {
    const remotes = SUBSCRIBER_VIEW_SECTIONS.filter((s) => s.remote);
    expect(remotes.map((s) => s.remote)).toEqual(['mfe-cap-account-view', 'mfe-cap-usage-billing']);
    for (const s of remotes) expect(s.inputs).toEqual(['accountId']);
    expect(SUBSCRIBER_VIEW_SECTIONS.some((s) => s.remote === 'mfe-cap-audit-trail')).toBe(false);
  });
});

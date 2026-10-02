import { server } from '../node';
import { resetMockDb } from '../lib/mock-db';

const get = (path: string, persona = 'analyst') =>
  fetch(`http://localhost/api${path}`, { headers: { Authorization: `Bearer mock.${persona}` } });

describe('360 profile handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => resetMockDb());
  afterAll(() => server.close());

  it('returns an account by id, including non-hero subscribers', async () => {
    expect((await (await get('/accounts/ACC-120077')).json()).lines).toHaveLength(1);
    expect((await get('/accounts/ACC-000000')).status).toBe(404);
  });

  it('returns all usage on an account', async () => {
    const rows = await (await get('/accounts/ACC-884210/usage')).json();
    expect(rows.filter((r: { flagged: boolean }) => r.flagged)).toHaveLength(3);
  });

  it('returns a partner profile with linked subscribers, behind partner360:view', async () => {
    const p = await (await get('/partners/DLR-55102')).json();
    expect(p).toMatchObject({ name: 'Sunrise Mobile', activations30d: 412, linkedAccountIds: ['ACC-884210'] });
    expect((await get('/partners/DLR-55102', 'auditor')).status).toBe(403);
  });
});

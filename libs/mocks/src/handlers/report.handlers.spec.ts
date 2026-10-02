import { server } from '../node';

const get = (path: string, persona = 'supervisor') =>
  fetch(`http://localhost/api${path}`, { headers: { Authorization: `Bearer mock.${persona}` } });

describe('report handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('filters case volume by domains and an inclusive date range', async () => {
    const rows = await (await get('/reports/case-volume?domains=FRAUD&from=2026-09-01&to=2026-09-30')).json();
    expect(rows.map((r: { week: string }) => r.week)).toEqual(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28']);
    expect(rows.every((r: { domain: string }) => r.domain === 'FRAUD')).toBe(true);
  });

  it('returns SLA rows where withinSla never exceeds closed', async () => {
    const rows = await (await get('/reports/sla')).json();
    expect(rows).toHaveLength(26 * 7);
    expect(rows.every((r: { closed: number; withinSla: number }) => r.withinSla <= r.closed)).toBe(true);
  });

  it('rejects bad queries and personas without reports:view', async () => {
    expect((await get('/reports/sla?from=2026-09-30&to=2026-01-01')).status).toBe(400);
    expect((await get('/reports/case-volume', 'analyst')).status).toBe(403);
  });
});

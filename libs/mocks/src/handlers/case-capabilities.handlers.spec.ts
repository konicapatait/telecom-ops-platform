import { server } from '../node';
import { resetMockDb } from '../lib/mock-db';

const as = (persona: string) => ({ Authorization: `Bearer mock.${persona}` });
const base = 'http://localhost/api/cases/FRD-2026-000142';

describe('case capability handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => resetMockDb());
  afterAll(() => server.close());

  it('returns the SIM-swap usage with three flagged events', async () => {
    const rows = await (await fetch(`${base}/usage`, { headers: as('analyst') })).json();
    expect(rows.filter((r: { flagged: boolean }) => r.flagged)).toHaveLength(3);
  });

  it('writes an audit event when a file is uploaded', async () => {
    const form = new FormData();
    form.append('file', new File(['x'], 'evidence.png', { type: 'image/png' }));
    const res = await fetch(`${base}/attachments`, { method: 'POST', body: form, headers: as('supervisor') });
    expect(res.status).toBe(201);
    const audit = await (await fetch(`${base}/audit`, { headers: as('supervisor') })).json();
    expect(audit[0]).toMatchObject({ action: 'ATTACHMENT_ADDED', detail: 'evidence.png', actor: 'Marcus Lee' });
  });

  it('enforces entitlements like the backend will', async () => {
    const form = new FormData();
    form.append('file', new File(['x'], 'nope.txt'));
    expect((await fetch(`${base}/attachments`, { method: 'POST', body: form, headers: as('auditor') })).status).toBe(
      403,
    );
    expect((await fetch(`${base}/audit`, { headers: as('analyst') })).status).toBe(403);
    expect((await fetch(`${base}/audit`, { headers: as('auditor') })).status).toBe(200);
  });

  it('serves the fraud overview only for fraud cases', async () => {
    const ok = await fetch('http://localhost/api/fraud/cases/FRD-2026-000142/overview', { headers: as('analyst') });
    expect((await ok.json()).riskScore).toBe(94);
    const wrongDomain = await fetch('http://localhost/api/fraud/cases/BIL-2026-003318/overview', {
      headers: as('analyst'),
    });
    expect(wrongDomain.status).toBe(404);
  });
});

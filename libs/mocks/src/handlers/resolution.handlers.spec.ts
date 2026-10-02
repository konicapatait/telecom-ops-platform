import { server } from '../node';
import { resetMockDb } from '../lib/mock-db';

const as = (p: string) => ({ Authorization: `Bearer mock.${p}`, 'Content-Type': 'application/json' });
const resolve = (caseId: string, body: object, persona = 'supervisor') =>
  fetch(`http://localhost/api/cases/${caseId}/resolution`, {
    method: 'POST',
    headers: as(persona),
    body: JSON.stringify(body),
  });

describe('resolution, account and domain overview handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => resetMockDb());
  afterAll(() => server.close());

  it('resolves a case: closes it and writes CASE_RESOLVED to the audit trail', async () => {
    expect((await resolve('FRD-2026-000142', { code: 'FRAUD_CONFIRMED', note: 'ID mismatch' })).status).toBe(201);
    const c = await (await fetch('http://localhost/api/cases/FRD-2026-000142', { headers: as('supervisor') })).json();
    expect(c.status).toBe('CLOSED');
    const audit = await (
      await fetch('http://localhost/api/cases/FRD-2026-000142/audit', { headers: as('supervisor') })
    ).json();
    expect(audit.find((e: { action: string }) => e.action === 'CASE_RESOLVED')).toMatchObject({
      detail: 'FRAUD_CONFIRMED · ID mismatch',
      component: 'Case decision',
    });
    expect(audit.find((e: { action: string }) => e.action === 'WORKFLOW_MOVED')).toMatchObject({
      category: 'STAGE',
      to: 'Closed',
    });
    expect(audit.filter((e: { action: string }) => e.action === 'CASE_ACCESSED')).toHaveLength(1); // logged once per user
    expect((await resolve('FRD-2026-000142', { code: 'FRAUD_CONFIRMED' })).status).toBe(409);
  });

  it('rejects codes from another domain and personas without case:resolve', async () => {
    expect((await resolve('BIL-2026-003318', { code: 'FRAUD_CONFIRMED' })).status).toBe(422);
    expect((await resolve('BIL-2026-003318', { code: 'DISPUTE_UPHELD' }, 'auditor')).status).toBe(403);
  });

  it('returns the subscriber account, and 404 for partner cases', async () => {
    const acc = await (
      await fetch('http://localhost/api/cases/FRD-2026-000142/account', { headers: as('analyst') })
    ).json();
    expect(acc.lines).toHaveLength(2);
    expect((await fetch('http://localhost/api/cases/PTR-2026-000057/account', { headers: as('analyst') })).status).toBe(
      404,
    );
  });

  it('serves each domain overview only for its own domain', async () => {
    expect(
      (await fetch('http://localhost/api/disputes/cases/BIL-2026-003318/overview', { headers: as('analyst') })).status,
    ).toBe(200);
    expect(
      (await fetch('http://localhost/api/porting/cases/BIL-2026-003318/overview', { headers: as('analyst') })).status,
    ).toBe(404);
    const p = await (
      await fetch('http://localhost/api/partners/cases/PTR-2026-000057/overview', { headers: as('analyst') })
    ).json();
    expect(p.name).toBe('Sunrise Mobile');
  });

  it('searches cases by id, name or phone number', async () => {
    const res = await (await fetch('http://localhost/api/cases?q=okafor&size=100', { headers: as('analyst') })).json();
    expect(res.items.map((c: { caseId: string }) => c.caseId)).toEqual(
      expect.arrayContaining(['BIL-2026-003318', 'NPT-2026-000088']),
    );
  });
});

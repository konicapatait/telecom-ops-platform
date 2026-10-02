import { server } from '../node';
import { HERO_CASES } from '../fixtures/cases';

describe('case handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterAll(() => server.close());

  it('filters the queue by domain', async () => {
    const res = await fetch('http://localhost/api/cases?domain=FRAUD&size=100');
    const body = await res.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.every((c: { domain: string }) => c.domain === 'FRAUD')).toBe(true);
  });

  it('returns hero case FRD-2026-000142 by id', async () => {
    const res = await fetch('http://localhost/api/cases/FRD-2026-000142');
    expect(await res.json()).toEqual(HERO_CASES[0]);
  });

  it('returns entitlements for the persona in the bearer token', async () => {
    const res = await fetch('http://localhost/api/me/entitlements', {
      headers: { Authorization: 'Bearer mock.auditor' },
    });
    const body = await res.json();
    expect(body.entitlements).toContain('case:audit:view');
    expect(body.entitlements).not.toContain('case:attachments:upload');
  });
});

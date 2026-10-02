import { server } from '../node';
import { resetMockDb } from '../lib/mock-db';

const get = (path: string) =>
  fetch(`http://localhost/api${path}`, { headers: { Authorization: 'Bearer mock.analyst' } });

describe('customer handlers', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => resetMockDb());
  afterAll(() => server.close());

  it('summarises a subscriber with open cases per domain, including its linked dealer', async () => {
    const c = await (await get('/customers/ACC-884210')).json();
    expect(c).toMatchObject({ kind: 'SUBSCRIBER', displayName: 'Maria Delgado', relatedSubjectIds: ['DLR-55102'] });
    expect(c.openCasesByDomain).toMatchObject({
      FRAUD: 1,
      SERVICE_ASSURANCE: 1,
      PARTNER_ONGOING: 1,
      PARTNER_FIELD_AUDIT: 1,
    });
  });

  it('finds customers by name or phone', async () => {
    expect((await (await get('/customers?q=delgado')).json()).map((c: { customerId: string }) => c.customerId)).toEqual(
      ['ACC-884210'],
    );
    expect((await (await get('/customers?q=555 0177')).json())[0].customerId).toBe('ACC-120077');
  });

  it('filters the case list by subjects', async () => {
    const page = await (await get('/cases?domain=FRAUD&subjects=ACC-884210&size=100')).json();
    expect(page.items.map((c: { caseId: string }) => c.caseId)).toEqual(['FRD-2026-000142']);
  });
});

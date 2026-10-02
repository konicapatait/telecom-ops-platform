/**
 * @file Mock API: the case list (domain/status/subjects/q filters, paging) and a case by id (logs access).
 */
import { http, HttpResponse } from 'msw';
import type { CaseSummary } from '@platform/contracts';
import { allCases, findCase, logAccess } from '../lib/mock-db';
import { personaFromRequest } from '../personas';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { api } from '../lib/api-path';

export const caseHandlers = [
  /** GET /api/cases?domain=FRAUD&status=NEW&page=0&size=25 */
  http.get(api('/cases'), async ({ request }) => {
    await mockDelay();
    const url = new URL(request.url);
    if (shouldFailApi(url.pathname)) return HttpResponse.json({ message: 'Simulated failure' }, { status: 500 });
    const domain = url.searchParams.get('domain');
    const status = url.searchParams.get('status');
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Math.min(Number(url.searchParams.get('size') ?? 25), 100);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    // ?subjects=ACC-1,DLR-2 : only cases about these subjects (Case management customer focus).
    const subjects = url.searchParams.get('subjects')?.split(',').filter(Boolean);
    const rows = allCases().filter(
      (c) =>
        (!domain || c.domain === domain) &&
        (!status || c.status === status) &&
        (!subjects || subjects.includes(c.subject.id)) &&
        (!q ||
          [c.caseId, c.subject.id, c.subject.displayName, c.subject.msisdn ?? ''].some((v) =>
            v.toLowerCase().includes(q),
          )),
    );
    return HttpResponse.json({ items: rows.slice(page * size, page * size + size), total: rows.length, page, size });
  }),

  http.get(api('/cases/:caseId'), async ({ params, request }) => {
    await mockDelay();
    const found = findCase(params['caseId'] as string);
    if (found) logAccess(found.caseId, personaFromRequest(request).displayName); // "Case accessed in view mode"
    return found ? HttpResponse.json<CaseSummary>(found) : HttpResponse.json({ message: 'Not found' }, { status: 404 });
  }),
];

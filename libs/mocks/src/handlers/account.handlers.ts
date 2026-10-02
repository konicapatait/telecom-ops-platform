/**
 * @file Mock API: GET /api/cases/:caseId/account (404 for partner cases).
 */
import { http, HttpResponse } from 'msw';
import type { Account } from '@platform/contracts';
import { accountForCase } from '../fixtures/accounts';
import { api } from '../lib/api-path';
import { forbidden, has, notFound } from '../lib/http-errors';
import { findCase } from '../lib/mock-db';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

export const accountHandlers = [
  /** The subscriber account behind a case (404 for partner cases). */
  http.get(api('/cases/:caseId/account'), async ({ params, request }) => {
    await mockDelay();
    if (shouldFailApi(new URL(request.url).pathname)) return HttpResponse.json({}, { status: 500 });
    if (!has(personaFromRequest(request), 'case:account:view')) return forbidden('case:account:view');
    const c = findCase(params['caseId'] as string);
    const account = c && accountForCase(c);
    return account ? HttpResponse.json<Account>(account) : notFound('Subscriber account');
  }),
];

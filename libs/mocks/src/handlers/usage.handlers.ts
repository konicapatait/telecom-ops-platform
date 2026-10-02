/**
 * @file Mock API: GET /api/cases/:caseId/usage (needs case:usage:view).
 */
import { http, HttpResponse } from 'msw';
import type { UsageRecord } from '@platform/contracts';
import { usageFor } from '../fixtures/usage';
import { api } from '../lib/api-path';
import { forbidden, has, simulatedFailure } from '../lib/http-errors';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

export const usageHandlers = [
  /** GET /api/cases/:caseId/usage */
  http.get(api('/cases/:caseId/usage'), async ({ params, request }) => {
    await mockDelay();
    if (shouldFailApi(new URL(request.url).pathname)) return simulatedFailure();
    if (!has(personaFromRequest(request), 'case:usage:view')) return forbidden('case:usage:view');
    return HttpResponse.json<UsageRecord[]>(usageFor(params['caseId'] as string));
  }),
];

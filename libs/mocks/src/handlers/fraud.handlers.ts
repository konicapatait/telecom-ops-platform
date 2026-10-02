/**
 * @file Mock API: GET /api/fraud/cases/:caseId/overview (fraud triggering info).
 */
import { http, HttpResponse } from 'msw';
import type { FraudOverview } from '@platform/contracts';
import { findCase } from '../lib/mock-db';
import { fraudOverviewFor } from '../fixtures/fraud';
import { api } from '../lib/api-path';
import { forbidden, has, notFound } from '../lib/http-errors';
import { mockDelay } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

export const fraudHandlers = [
  http.get(api('/fraud/cases/:caseId/overview'), async ({ params, request }) => {
    await mockDelay();
    if (!has(personaFromRequest(request), 'fraud:view')) return forbidden('fraud:view');
    const caseId = params['caseId'] as string;
    if (findCase(caseId)?.domain !== 'FRAUD') return notFound('Fraud case');
    return HttpResponse.json<FraudOverview>(fraudOverviewFor(caseId));
  }),
];

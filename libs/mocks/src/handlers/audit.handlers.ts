/**
 * @file Mock API: GET /api/cases/:caseId/audit. Read-only by design: the backend writes audit events.
 */
import { http, HttpResponse } from 'msw';
import type { AuditEvent } from '@platform/contracts';
import { api } from '../lib/api-path';
import { forbidden, has, simulatedFailure } from '../lib/http-errors';
import { auditFor } from '../lib/mock-db';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

/** Read-only by design: there is no POST. Audit events are written server-side as a side effect of actions. */
export const auditHandlers = [
  http.get(api('/cases/:caseId/audit'), async ({ params, request }) => {
    await mockDelay();
    if (shouldFailApi(new URL(request.url).pathname)) return simulatedFailure();
    if (!has(personaFromRequest(request), 'case:audit:view')) return forbidden('case:audit:view');
    return HttpResponse.json<AuditEvent[]>(auditFor(params['caseId'] as string));
  }),
];

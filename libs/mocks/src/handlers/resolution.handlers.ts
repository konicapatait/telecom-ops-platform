/**
 * @file Mock API: read and record a case decision; validates the code per domain and writes audit events.
 */
import { http, HttpResponse } from 'msw';
import type { CaseResolution } from '@platform/contracts';
import { api } from '../lib/api-path';
import { forbidden, has, notFound } from '../lib/http-errors';
import { appendAudit, findCase, resolutionFor, resolveCase } from '../lib/mock-db';
import { mockDelay } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

/** Valid codes per domain. The backend owns validation; the UI shows the domain's list (ADR-0020). */
const CODE_PREFIX: Record<string, string> = {
  FRAUD: 'FRAUD_',
  BILLING_DISPUTE: 'DISPUTE_',
  SERVICE_ASSURANCE: 'SVC_',
  NUMBER_PORTING: 'PORT_',
  PARTNER_ONBOARDING: 'ONB_',
  PARTNER_ONGOING: 'PERF_',
  PARTNER_FIELD_AUDIT: 'AUDIT_',
};

export const resolutionHandlers = [
  http.get(api('/cases/:caseId/resolution'), async ({ params }) => {
    const r = resolutionFor(params['caseId'] as string);
    return r ? HttpResponse.json<CaseResolution>(r) : notFound('Resolution');
  }),

  /** POST { code, note? }: closes the case and records CASE_RESOLVED in the audit trail. */
  http.post(api('/cases/:caseId/resolution'), async ({ params, request }) => {
    await mockDelay();
    const persona = personaFromRequest(request);
    if (!has(persona, 'case:resolve')) return forbidden('case:resolve');
    const c = findCase(params['caseId'] as string);
    if (!c) return notFound('Case');
    if (c.status === 'CLOSED') return HttpResponse.json({ message: 'Case is already closed' }, { status: 409 });
    const body = (await request.json()) as { code?: string; note?: string };
    if (!body.code?.startsWith(CODE_PREFIX[c.domain])) {
      return HttpResponse.json({ message: `Code ${body.code} is not valid for ${c.domain}` }, { status: 422 });
    }
    const resolution: CaseResolution = {
      caseId: c.caseId,
      code: body.code,
      note: body.note?.trim() || undefined,
      resolvedBy: persona.displayName,
      resolvedAt: new Date().toISOString(),
    };
    resolveCase(resolution);
    appendAudit(
      c.caseId,
      'CASE_RESOLVED',
      body.code + (resolution.note ? ` · ${resolution.note}` : ''),
      persona.displayName,
      {
        component: 'Case decision',
      },
    );
    appendAudit(c.caseId, 'WORKFLOW_MOVED', 'Case moved to Closed', 'System', {
      category: 'STAGE',
      component: 'Workflow',
      to: 'Closed',
    });
    return HttpResponse.json(resolution, { status: 201 });
  }),
];

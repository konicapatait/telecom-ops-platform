/**
 * @file Mock API: one triggering-info endpoint per case domain, each owned by that domain's backend.
 */
import { http, HttpResponse, type JsonBodyType } from 'msw';
import type { CaseDomain, CaseSummary } from '@platform/contracts';
import {
  disputeOverviewFor,
  partnerOverviewFor,
  portingOverviewFor,
  serviceOverviewFor,
} from '../fixtures/domain-overviews';
import { api } from '../lib/api-path';
import { forbidden, has, notFound } from '../lib/http-errors';
import { findCase } from '../lib/mock-db';
import { mockDelay } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

/** One overview endpoint per domain, each owned by that domain's backend (mirrors /api/fraud/...). */
function overview(path: string, domains: CaseDomain[], entitlement: string, build: (c: CaseSummary) => JsonBodyType) {
  return http.get(api(`/${path}/cases/:caseId/overview` as `/${string}`), async ({ params, request }) => {
    await mockDelay();
    if (!has(personaFromRequest(request), entitlement)) return forbidden(entitlement);
    const c = findCase(params['caseId'] as string);
    return c && domains.includes(c.domain) ? HttpResponse.json(build(c)) : notFound('Case');
  });
}

export const domainOverviewHandlers = [
  overview('disputes', ['BILLING_DISPUTE'], 'disputes:view', disputeOverviewFor),
  overview('assurance', ['SERVICE_ASSURANCE'], 'assurance:view', serviceOverviewFor),
  overview('porting', ['NUMBER_PORTING'], 'porting:view', portingOverviewFor),
  overview(
    'partners',
    ['PARTNER_ONBOARDING', 'PARTNER_ONGOING', 'PARTNER_FIELD_AUDIT'],
    'partners:view',
    partnerOverviewFor,
  ),
];

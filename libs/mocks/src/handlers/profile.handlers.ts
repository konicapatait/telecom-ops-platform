/**
 * @file Mock API for 360 views: account and usage by account id, partner profile by partner id (ADR-0024).
 */
import { http, HttpResponse } from 'msw';
import type { Account, PartnerProfile, UsageRecord } from '@platform/contracts';
import { ACCOUNTS, accountForCase } from '../fixtures/accounts';
import { CUSTOMER_LINKS } from '../fixtures/customers';
import { PARTNER_OVERVIEWS } from '../fixtures/domain-overviews';
import { usageFor } from '../fixtures/usage';
import { api } from '../lib/api-path';
import { forbidden, has, notFound } from '../lib/http-errors';
import { allCases } from '../lib/mock-db';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

/** Account by id: hero fixtures, else derived from any case about that subscriber. */
function account(accountId: string): Account | null {
  if (ACCOUNTS[accountId]) return ACCOUNTS[accountId];
  const c = allCases().find((x) => x.subject.id === accountId && x.subject.kind === 'SUBSCRIBER');
  return c ? accountForCase(c) : null;
}

/** 360 endpoints (Phase 4, ADR-0024): data by account / partner id rather than by case. */
export const profileHandlers = [
  http.get(api('/accounts/:accountId'), async ({ params, request }) => {
    await mockDelay();
    if (
      !has(personaFromRequest(request), 'subscribers:view') &&
      !has(personaFromRequest(request), 'case:account:view')
    ) {
      return forbidden('subscribers:view');
    }
    const a = account(params['accountId'] as string);
    return a ? HttpResponse.json<Account>(a) : notFound('Account');
  }),

  /** All usage on the account: events from every case about it, newest first. */
  http.get(api('/accounts/:accountId/usage'), async ({ params, request }) => {
    await mockDelay();
    if (shouldFailApi(new URL(request.url).pathname)) return HttpResponse.json({}, { status: 500 });
    if (!has(personaFromRequest(request), 'case:usage:view')) return forbidden('case:usage:view');
    const id = params['accountId'] as string;
    if (!account(id)) return notFound('Account');
    const rows = allCases()
      .filter((c) => c.subject.id === id)
      .flatMap((c) => usageFor(c.caseId));
    const unique = [...new Map(rows.map((r) => [r.recordId, r])).values()];
    return HttpResponse.json<UsageRecord[]>(unique.sort((a, b) => b.at.localeCompare(a.at)));
  }),

  http.get(api('/partners/:partnerId'), async ({ params, request }) => {
    await mockDelay();
    if (!has(personaFromRequest(request), 'partner360:view')) return forbidden('partner360:view');
    const id = params['partnerId'] as string;
    const known = PARTNER_OVERVIEWS[id];
    const subject = allCases().find((c) => c.subject.id === id && c.subject.kind === 'PARTNER')?.subject;
    if (!known && !subject) return notFound('Partner');
    const profile: PartnerProfile = known
      ? { ...known, linkedAccountIds: CUSTOMER_LINKS[id] ?? [] }
      : {
          partnerId: id,
          name: subject!.displayName,
          tier: 'BRONZE',
          region: 'Colorado',
          activations30d: 0,
          qualityScore: 0,
          chargebackRate: 0,
          findings: [],
          linkedAccountIds: CUSTOMER_LINKS[id] ?? [],
        };
    return HttpResponse.json(profile);
  }),
];

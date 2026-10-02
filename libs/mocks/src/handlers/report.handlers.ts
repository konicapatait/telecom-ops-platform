/**
 * @file Mock API for reporting (Phase 5): case volume and SLA series filtered by domains and date range (reports:view).
 */
import { http, HttpResponse } from 'msw';
import type { CaseDomain, CaseVolumePoint, SlaPoint } from '@platform/contracts';
import { CASE_VOLUME, REPORT_DOMAINS, SLA_SERIES } from '../fixtures/reports';
import { api } from '../lib/api-path';
import { forbidden, has, simulatedFailure } from '../lib/http-errors';
import { mockDelay, shouldFailApi } from '../lib/mock-flags';
import { personaFromRequest } from '../personas';

/** Parses ?domains=&from=&to= ; a 400 body when the range is invalid. */
function parseQuery(url: URL): { domains: CaseDomain[]; from: string; to: string } | string {
  const domains = (url.searchParams.get('domains') ?? '').split(',').filter(Boolean) as CaseDomain[];
  const from = url.searchParams.get('from') ?? '0000-01-01';
  const to = url.searchParams.get('to') ?? '9999-12-31';
  if (domains.some((d) => !REPORT_DOMAINS.includes(d))) return `Unknown domain in ${domains.join(',')}`;
  if (from > to) return `from (${from}) is after to (${to})`;
  return { domains: domains.length ? domains : REPORT_DOMAINS, from, to };
}

/** GET /api/reports/<name>: `rows` filtered by the query. */
function series<T extends { week: string; domain: CaseDomain }>(name: 'case-volume' | 'sla', rows: T[]) {
  return http.get(api(`/reports/${name}`), async ({ request }) => {
    await mockDelay();
    const url = new URL(request.url);
    if (shouldFailApi(url.pathname)) return simulatedFailure();
    if (!has(personaFromRequest(request), 'reports:view')) return forbidden('reports:view');
    const q = parseQuery(url);
    if (typeof q === 'string') return HttpResponse.json({ message: q }, { status: 400 });
    return HttpResponse.json(rows.filter((r) => q.domains.includes(r.domain) && r.week >= q.from && r.week <= q.to));
  });
}

export const reportHandlers = [
  series<CaseVolumePoint>('case-volume', CASE_VOLUME),
  series<SlaPoint>('sla', SLA_SERIES),
];

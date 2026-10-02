/**
 * @file Customer summaries and search for the Case management overview, incl. subscriber ↔ dealer links (ADR-0022).
 */
import type { CaseDomain, CaseSummary, CustomerSummary } from '@platform/contracts';
import { relevantSubjectIds } from '@platform/contracts';
import { ACCOUNTS } from './accounts';
import { PARTNER_OVERVIEWS } from './domain-overviews';

/** Subscriber ↔ dealer links (e.g. the dealer that activated or swapped a SIM). Symmetric. */
export const CUSTOMER_LINKS: Record<string, string[]> = {
  'ACC-884210': ['DLR-55102'],
  'DLR-55102': ['ACC-884210'],
};

const DOMAINS: CaseDomain[] = [
  'FRAUD',
  'BILLING_DISPUTE',
  'SERVICE_ASSURANCE',
  'NUMBER_PORTING',
  'PARTNER_ONBOARDING',
  'PARTNER_ONGOING',
  'PARTNER_FIELD_AUDIT',
];

/** Builds a customer summary from case subjects + account/partner fixtures. Counts use the live case list. */
export function customerSummary(customerId: string, cases: CaseSummary[]): CustomerSummary | null {
  const subject = cases.find((c) => c.subject.id === customerId)?.subject;
  const account = ACCOUNTS[customerId];
  const partner = PARTNER_OVERVIEWS[customerId];
  if (!subject && !account && !partner) return null;

  const kind = partner || subject?.kind === 'PARTNER' ? 'PARTNER' : 'SUBSCRIBER';
  const base: CustomerSummary =
    kind === 'SUBSCRIBER'
      ? {
          customerId,
          kind,
          displayName: account?.holder ?? subject!.displayName,
          status: account?.status ?? 'ACTIVE',
          segment: account?.segment,
          since: account?.customerSince,
          contact: account?.lines[0]?.msisdn ?? subject?.msisdn,
          plan: account?.lines[0]?.plan,
          lineCount: account?.lines.length,
          balance: account?.balance,
          currency: account?.currency,
          relatedSubjectIds: CUSTOMER_LINKS[customerId] ?? [],
          openCasesByDomain: {},
        }
      : {
          customerId,
          kind,
          displayName: partner?.name ?? subject!.displayName,
          status: 'ACTIVE',
          segment: partner?.tier,
          contact: partner?.region,
          relatedSubjectIds: CUSTOMER_LINKS[customerId] ?? [],
          openCasesByDomain: {},
        };

  for (const d of DOMAINS) {
    const subjects = relevantSubjectIds(d, base);
    const n = cases.filter((c) => c.domain === d && c.status !== 'CLOSED' && subjects.includes(c.subject.id)).length;
    if (n) base.openCasesByDomain[d] = n;
  }
  return base;
}

/** Search customers by id, name or phone number across every case subject. */
export function searchCustomers(q: string, cases: CaseSummary[], limit = 10): CustomerSummary[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const ids = [...new Set(cases.map((c) => c.subject.id))].filter((id) => {
    const s = cases.find((c) => c.subject.id === id)!.subject;
    return [s.id, s.displayName, s.msisdn ?? ''].some((v) => v.toLowerCase().includes(needle));
  });
  return ids.slice(0, limit).map((id) => customerSummary(id, cases)!);
}

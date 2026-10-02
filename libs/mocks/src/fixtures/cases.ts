/**
 * @file Case fixtures: hero cases with FIXED ids (demos and E2E rely on them) plus seeded bulk rows.
 */
import type { CaseDomain, CaseStatus, CaseSummary, CasePriority, CaseType } from '@platform/contracts';
import { pick, seededRandom } from './seeded-random';

/**
 * Hero cases: FIXED ids that demos and E2E tests rely on. Never renumber them.
 * Phone numbers use the fictional 555-01xx range.
 */
export const HERO_CASES: CaseSummary[] = [
  {
    caseId: 'FRD-2026-000142',
    domain: 'FRAUD',
    caseType: 'FRAUD_SIM_SWAP',
    status: 'IN_REVIEW',
    priority: 'CRITICAL',
    subject: { id: 'ACC-884210', displayName: 'Maria Delgado', kind: 'SUBSCRIBER', msisdn: '+1 303 555 0142' },
    assignee: { userId: 'u-analyst-01', displayName: 'Priya Natarajan' },
    openedAt: '2026-09-21T14:05:00Z',
    dueAt: '2026-09-23T14:05:00Z',
  },
  {
    caseId: 'BIL-2026-003318',
    domain: 'BILLING_DISPUTE',
    caseType: 'BILLING_DISPUTE_ROAMING',
    status: 'ESCALATED',
    priority: 'HIGH',
    subject: { id: 'ACC-120077', displayName: 'Daniel Okafor', kind: 'SUBSCRIBER', msisdn: '+1 720 555 0177' },
    openedAt: '2026-09-28T09:12:00Z',
    dueAt: '2026-10-12T23:59:00Z',
  },
  {
    caseId: 'PTR-2026-000057',
    domain: 'PARTNER_FIELD_AUDIT',
    caseType: 'PARTNER_FIELD_AUDIT_STORE_VISIT',
    status: 'NEW',
    priority: 'MEDIUM',
    subject: { id: 'DLR-55102', displayName: 'Sunrise Mobile (Dealer 55102)', kind: 'PARTNER' },
    openedAt: '2026-09-30T16:40:00Z',
  },
  {
    caseId: 'SVC-2026-000311',
    domain: 'SERVICE_ASSURANCE',
    caseType: 'SERVICE_ASSURANCE_DROPPED_CALLS',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    subject: { id: 'ACC-884210', displayName: 'Maria Delgado', kind: 'SUBSCRIBER', msisdn: '+1 303 555 0142' },
    assignee: { userId: 'u-supervisor-01', displayName: 'Marcus Lee' },
    openedAt: '2026-09-29T07:30:00Z',
    dueAt: '2026-10-03T07:30:00Z',
  },
  {
    caseId: 'NPT-2026-000088',
    domain: 'NUMBER_PORTING',
    caseType: 'NUMBER_PORTING_REJECTED_PORT',
    status: 'PENDING_INFO',
    priority: 'MEDIUM',
    subject: { id: 'ACC-120077', displayName: 'Daniel Okafor', kind: 'SUBSCRIBER', msisdn: '+1 720 555 0177' },
    openedAt: '2026-09-27T11:00:00Z',
    dueAt: '2026-10-04T11:00:00Z',
  },
  {
    caseId: 'PTR-2026-000031',
    domain: 'PARTNER_ONBOARDING',
    caseType: 'PARTNER_ONBOARDING_KYC_REVIEW',
    status: 'NEW',
    priority: 'MEDIUM',
    subject: { id: 'DLR-55890', displayName: 'Peak Wireless (Dealer 55890)', kind: 'PARTNER' },
    openedAt: '2026-09-29T13:15:00Z',
  },
  {
    caseId: 'PTR-2026-000044',
    domain: 'PARTNER_ONGOING',
    caseType: 'PARTNER_ONGOING_PERFORMANCE',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    subject: { id: 'DLR-55102', displayName: 'Sunrise Mobile (Dealer 55102)', kind: 'PARTNER' },
    assignee: { userId: 'u-supervisor-01', displayName: 'Marcus Lee' },
    openedAt: '2026-09-24T10:00:00Z',
  },
];

const PREFIX: Record<CaseDomain, string> = {
  FRAUD: 'FRD',
  BILLING_DISPUTE: 'BIL',
  SERVICE_ASSURANCE: 'SVC',
  NUMBER_PORTING: 'NPT',
  PARTNER_ONBOARDING: 'PTR',
  PARTNER_ONGOING: 'PTR',
  PARTNER_FIELD_AUDIT: 'PTR',
};
const TYPES: Record<CaseDomain, string[]> = {
  FRAUD: ['SIM_SWAP', 'SUBSCRIPTION', 'IRSF', 'WANGIRI'],
  BILLING_DISPUTE: ['ROAMING', 'PREMIUM_SMS', 'DOUBLE_CHARGE'],
  SERVICE_ASSURANCE: ['OUTAGE', 'SLOW_DATA', 'DROPPED_CALLS'],
  NUMBER_PORTING: ['PORT_IN', 'PORT_OUT', 'REJECTED_PORT'],
  PARTNER_ONBOARDING: ['KYC_REVIEW', 'CONTRACT'],
  PARTNER_ONGOING: ['PERFORMANCE', 'COMMISSION'],
  PARTNER_FIELD_AUDIT: ['STORE_VISIT', 'MYSTERY_SHOP'],
};
const STATUSES: CaseStatus[] = ['NEW', 'IN_REVIEW', 'ESCALATED', 'PENDING_INFO', 'CLOSED'];
const PRIORITIES: CasePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const FIRST = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Riley', 'Morgan', 'Casey', 'Jamie', 'Avery', 'Quinn'];
const LAST = ['Nguyen', 'Garcia', 'Smith', 'Kowalski', 'Haddad', 'Ito', 'Mensah', 'Rossi', 'Novak', 'Silva'];

/** Bulk rows for queue and search pages. Same seed => same rows. */
export function generateCases({ seed, count }: { seed: number; count: number }): CaseSummary[] {
  const rand = seededRandom(seed);
  const domains = Object.keys(PREFIX) as CaseDomain[];
  return Array.from({ length: count }, (_, i) => {
    const domain = pick(rand, domains);
    const partner = domain.startsWith('PARTNER');
    const n = String(100000 + i).slice(-6);
    const opened = new Date(Date.UTC(2026, 8, 1) + Math.floor(rand() * 30 * 86400000));
    const line = String(100 + Math.floor(rand() * 100))
      .padStart(4, '0')
      .slice(-2);
    return {
      caseId: `${PREFIX[domain]}-2026-${n}`,
      domain,
      caseType: `${domain}_${pick(rand, TYPES[domain])}` as CaseType,
      status: pick(rand, STATUSES),
      priority: pick(rand, PRIORITIES),
      subject: partner
        ? { id: `DLR-${50000 + Math.floor(rand() * 9999)}`, displayName: `${pick(rand, LAST)} Mobile`, kind: 'PARTNER' }
        : {
            id: `ACC-${100000 + Math.floor(rand() * 899999)}`,
            displayName: `${pick(rand, FIRST)} ${pick(rand, LAST)}`,
            kind: 'SUBSCRIBER',
            msisdn: `+1 303 555 01${line}`,
          },
      openedAt: opened.toISOString(),
    } satisfies CaseSummary;
  });
}

export const CASES: CaseSummary[] = [...HERO_CASES, ...generateCases({ seed: 42, count: 200 })];

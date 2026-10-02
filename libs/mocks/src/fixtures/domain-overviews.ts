/**
 * @file Triggering-info data per case domain (disputes, assurance, porting, partners): hero fixtures plus generated defaults.
 */
import type {
  CaseSummary,
  DisputeOverview,
  PartnerOverview,
  PortingOverview,
  ServiceIncidentOverview,
} from '@platform/contracts';

const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 3);

export const DISPUTE_OVERVIEWS: Record<string, DisputeOverview> = {
  'BIL-2026-003318': {
    caseId: 'BIL-2026-003318',
    billingPeriod: 'Aug 28 – Sep 27, 2026',
    disputedAmount: 742.6,
    currency: 'USD',
    customerClaim:
      'Roaming was disabled on all business lines before the trip to Toronto; customer disputes every roaming charge.',
    items: [
      {
        itemId: 'INV-88-01',
        date: '2026-09-12T00:00:00Z',
        description: 'Roaming data, Canada (2.1 GB)',
        amount: 512.4,
        category: 'ROAMING',
      },
      {
        itemId: 'INV-88-02',
        date: '2026-09-13T00:00:00Z',
        description: 'Roaming voice, Canada (96 min)',
        amount: 182.2,
        category: 'ROAMING',
      },
      {
        itemId: 'INV-88-03',
        date: '2026-09-20T00:00:00Z',
        description: 'Premium SMS subscription',
        amount: 48.0,
        category: 'PREMIUM_SMS',
      },
    ],
  },
};
export function disputeOverviewFor(c: CaseSummary): DisputeOverview {
  return (
    DISPUTE_OVERVIEWS[c.caseId] ?? {
      caseId: c.caseId,
      billingPeriod: 'Aug 28 – Sep 27, 2026',
      disputedAmount: (h(c.caseId) % 40000) / 100,
      currency: 'USD',
      customerClaim: 'Customer disputes a charge on the latest bill.',
      items: [
        {
          itemId: `INV-${c.caseId.slice(-4)}`,
          date: '2026-09-15T00:00:00Z',
          description: 'Disputed charge',
          amount: (h(c.caseId) % 40000) / 100,
          category: 'OTHER',
        },
      ],
    }
  );
}

export const SERVICE_OVERVIEWS: Record<string, ServiceIncidentOverview> = {
  'SVC-2026-000311': {
    caseId: 'SVC-2026-000311',
    incidentType: 'DROPPED_CALLS',
    siteId: 'BLD-0417',
    region: 'Boulder, CO',
    startedAt: '2026-09-28T18:10:00Z',
    affectedSubscribers: 1840,
    networkTicket: 'NOC-77812',
    kpis: [
      { name: 'Call drop rate', value: 4.8, unit: '%', threshold: 1.5, breached: true },
      { name: 'Call setup success', value: 96.1, unit: '%', threshold: 98, breached: true },
      { name: 'Avg. throughput', value: 41, unit: 'Mbps', threshold: 20, breached: false },
    ],
  },
};
export function serviceOverviewFor(c: CaseSummary): ServiceIncidentOverview {
  return (
    SERVICE_OVERVIEWS[c.caseId] ?? {
      caseId: c.caseId,
      incidentType: 'DEGRADATION',
      siteId: `SITE-${h(c.caseId) % 9000}`,
      region: 'Denver, CO',
      startedAt: c.openedAt,
      affectedSubscribers: h(c.caseId) % 900,
      kpis: [{ name: 'Avg. throughput', value: 12, unit: 'Mbps', threshold: 20, breached: true }],
    }
  );
}

export const PORTING_OVERVIEWS: Record<string, PortingOverview> = {
  'NPT-2026-000088': {
    caseId: 'NPT-2026-000088',
    direction: 'PORT_IN',
    msisdn: '+1 720 555 0177',
    donorCarrier: 'Mountain Mobile',
    recipientCarrier: 'Us',
    requestedAt: '2026-09-26T15:00:00Z',
    rejectionReason: 'Donor carrier: account PIN mismatch (code 6P)',
    steps: [
      { name: 'Port request submitted', status: 'DONE', at: '2026-09-26T15:00:00Z' },
      { name: 'Donor validation', status: 'FAILED', at: '2026-09-27T09:12:00Z', detail: 'PIN mismatch' },
      { name: 'Number activation', status: 'PENDING' },
    ],
  },
};
export function portingOverviewFor(c: CaseSummary): PortingOverview {
  return (
    PORTING_OVERVIEWS[c.caseId] ?? {
      caseId: c.caseId,
      direction: c.caseType.endsWith('PORT_OUT') ? 'PORT_OUT' : 'PORT_IN',
      msisdn: c.subject.msisdn ?? '+1 303 555 0100',
      donorCarrier: 'Peak Telecom',
      recipientCarrier: 'Us',
      requestedAt: c.openedAt,
      steps: [
        { name: 'Port request submitted', status: 'DONE', at: c.openedAt },
        { name: 'Donor validation', status: 'PENDING' },
      ],
    }
  );
}

export const PARTNER_OVERVIEWS: Record<string, Omit<PartnerOverview, 'caseId'>> = {
  'DLR-55102': {
    partnerId: 'DLR-55102',
    name: 'Sunrise Mobile',
    tier: 'SILVER',
    region: 'Denver Metro',
    activations30d: 412,
    qualityScore: 61,
    chargebackRate: 3.9,
    findings: [
      {
        findingId: 'F-1',
        title: 'SIM swaps without ID scan',
        severity: 'HIGH',
        detail: '7 swaps in 30 days lack an ID-scan attachment (incl. FRD-2026-000142).',
      },
      {
        findingId: 'F-2',
        title: 'Out-of-region activations',
        severity: 'MEDIUM',
        detail: '18% of activations for customers billed > 100 km away.',
      },
    ],
  },
  'DLR-55890': {
    partnerId: 'DLR-55890',
    name: 'Peak Wireless',
    tier: 'BRONZE',
    region: 'Colorado Springs',
    activations30d: 0,
    qualityScore: 0,
    chargebackRate: 0,
    findings: [
      {
        findingId: 'F-1',
        title: 'Beneficial-owner document missing',
        severity: 'MEDIUM',
        detail: 'KYC pack incomplete: ownership declaration not uploaded.',
      },
    ],
  },
};
export function partnerOverviewFor(c: CaseSummary): PartnerOverview {
  const known = PARTNER_OVERVIEWS[c.subject.id];
  return known
    ? { caseId: c.caseId, ...known }
    : {
        caseId: c.caseId,
        partnerId: c.subject.id,
        name: c.subject.displayName,
        tier: 'BRONZE',
        region: 'Colorado',
        activations30d: h(c.caseId) % 300,
        qualityScore: 50 + (h(c.caseId) % 50),
        chargebackRate: (h(c.caseId) % 50) / 10,
        findings: [],
      };
}

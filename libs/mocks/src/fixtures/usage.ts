/**
 * @file Usage & billing fixtures: the flagged events behind hero case FRD-2026-000142, plus generated usage.
 */
import type { UsageRecord, UsageType } from '@platform/contracts';
import { pick, seededRandom } from './seeded-random';

/** The events behind the SIM-swap alert on hero case FRD-2026-000142. */
export const USAGE_BY_CASE: Record<string, UsageRecord[]> = {
  'FRD-2026-000142': [
    {
      recordId: 'EVT-9001',
      at: '2026-09-21T02:14:00Z',
      type: 'SIM_SWAP',
      detail: 'New SIM activated at Dealer 55102',
      amount: 0,
      currency: 'USD',
      flagged: true,
      flagReason: "SIM swap outside customer's home region",
    },
    {
      recordId: 'EVT-9002',
      at: '2026-09-21T02:31:00Z',
      type: 'TOP_UP',
      detail: 'Prepaid top-up by new card',
      amount: 100.0,
      currency: 'USD',
      flagged: true,
      flagReason: 'Top-up within 30 minutes of SIM swap',
    },
    {
      recordId: 'EVT-9003',
      at: '2026-09-21T02:48:00Z',
      type: 'VOICE',
      detail: 'Call to premium-rate international number',
      amount: 87.4,
      currency: 'USD',
      durationSec: 2460,
      flagged: true,
      flagReason: 'High-cost destination',
    },
    {
      recordId: 'EVT-9004',
      at: '2026-09-20T18:05:00Z',
      type: 'DATA',
      detail: 'Home network data session',
      amount: 0,
      currency: 'USD',
      volumeMb: 412,
      flagged: false,
    },
    {
      recordId: 'EVT-9005',
      at: '2026-09-20T12:40:00Z',
      type: 'SMS',
      detail: 'SMS to +1 303 555 0199',
      amount: 0,
      currency: 'USD',
      flagged: false,
    },
    {
      recordId: 'EVT-9006',
      at: '2026-09-19T09:00:00Z',
      type: 'CHARGE',
      detail: 'Monthly plan charge',
      amount: 45.0,
      currency: 'USD',
      flagged: false,
    },
  ],
};

const DETAILS: Record<UsageType, string> = {
  VOICE: 'Outgoing call',
  DATA: 'Data session',
  SMS: 'Outgoing SMS',
  TOP_UP: 'Prepaid top-up',
  SIM_SWAP: 'SIM change',
  CHARGE: 'Recurring charge',
};

/** Deterministic usage for any non-hero case, so every case in the queue has something to show. */
export function usageFor(caseId: string): UsageRecord[] {
  if (USAGE_BY_CASE[caseId]) return USAGE_BY_CASE[caseId];
  const rand = seededRandom([...caseId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7));
  const types: UsageType[] = ['VOICE', 'DATA', 'SMS', 'CHARGE', 'TOP_UP'];
  return Array.from({ length: 5 }, (_, i) => {
    const type = pick(rand, types);
    return {
      recordId: `EVT-${caseId.slice(-4)}-${i}`,
      at: new Date(Date.UTC(2026, 8, 25) - i * 7_200_000).toISOString(),
      type,
      detail: DETAILS[type],
      amount: type === 'DATA' || type === 'SMS' ? 0 : Math.round(rand() * 6000) / 100,
      currency: 'USD',
      ...(type === 'VOICE' ? { durationSec: Math.floor(rand() * 900) } : {}),
      ...(type === 'DATA' ? { volumeMb: Math.floor(rand() * 900) } : {}),
      flagged: false,
    } satisfies UsageRecord;
  });
}

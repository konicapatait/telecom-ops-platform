/**
 * @file Subscriber account fixtures (account → lines → devices) and derived accounts for non-hero cases.
 */
import type { Account, CaseSummary } from '@platform/contracts';
import { seededRandom, pick } from './seeded-random';

export const ACCOUNTS: Record<string, Account> = {
  'ACC-884210': {
    accountId: 'ACC-884210',
    holder: 'Maria Delgado',
    segment: 'CONSUMER',
    status: 'SUSPENDED',
    customerSince: '2019-04-12T00:00:00Z',
    billingAddress: '1420 Pearl St, Boulder, CO 80302',
    balance: 232.4,
    currency: 'USD',
    lines: [
      {
        msisdn: '+1 303 555 0142',
        plan: 'Unlimited Plus',
        status: 'SUSPENDED',
        simIccid: '8901 2600 0000 1420 551',
        activatedAt: '2026-09-21T02:14:00Z',
        device: { make: 'Apple', model: 'iPhone 16', imei: '35 291011 482113 7' },
      },
      {
        msisdn: '+1 303 555 0143',
        plan: 'Tablet Data 10GB',
        status: 'ACTIVE',
        simIccid: '8901 2600 0000 1420 552',
        activatedAt: '2023-02-01T00:00:00Z',
        device: { make: 'Samsung', model: 'Galaxy Tab S9', imei: '35 880417 100233 4' },
      },
    ],
  },
  'ACC-120077': {
    accountId: 'ACC-120077',
    holder: 'Daniel Okafor',
    segment: 'SMB',
    status: 'ACTIVE',
    customerSince: '2021-08-30T00:00:00Z',
    billingAddress: '77 Larimer Sq, Denver, CO 80202',
    balance: 1184.9,
    currency: 'USD',
    lines: [
      {
        msisdn: '+1 720 555 0177',
        plan: 'Business Unlimited',
        status: 'ACTIVE',
        simIccid: '8901 2600 0000 0177 001',
        activatedAt: '2021-08-30T00:00:00Z',
        device: { make: 'Google', model: 'Pixel 9', imei: '35 410921 017700 2' },
      },
    ],
  },
};

/** Subscriber account behind a case; null for partner cases. Non-hero accounts are generated from the case. */
export function accountForCase(c: CaseSummary): Account | null {
  if (c.subject.kind !== 'SUBSCRIBER') return null;
  if (ACCOUNTS[c.subject.id]) return ACCOUNTS[c.subject.id];
  const rand = seededRandom([...c.subject.id].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 11));
  return {
    accountId: c.subject.id,
    holder: c.subject.displayName,
    segment: pick(rand, ['CONSUMER', 'SMB'] as const),
    status: 'ACTIVE',
    customerSince: '2022-01-15T00:00:00Z',
    billingAddress: '1 Main St, Denver, CO 80202',
    balance: Math.round(rand() * 30000) / 100,
    currency: 'USD',
    lines: [
      {
        msisdn: c.subject.msisdn ?? '+1 303 555 0100',
        plan: pick(rand, ['Essentials', 'Unlimited', 'Unlimited Plus']),
        status: 'ACTIVE',
        simIccid: '8901 2600 0000 9999 001',
        activatedAt: '2022-01-15T00:00:00Z',
        device: { make: 'Apple', model: 'iPhone 15', imei: '35 000000 000000 0' },
      },
    ],
  };
}

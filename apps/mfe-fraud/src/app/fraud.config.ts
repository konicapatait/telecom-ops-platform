/**
 * @file Fraud's case screen, as data (ADR-0005).
 */
import type { CaseDomainConfig } from '@platform/contracts';

/**
 * Fraud's case screen, as data (ADR-0005). Adding a tab is a change HERE, not in the layout.
 */
export const FRAUD_DOMAIN_CONFIG: CaseDomainConfig = {
  domain: 'FRAUD',
  title: 'Fraud case',
  queueTitle: 'Fraud alerts',
  // ADR-0023: every case screen has the same four tabs (Case decision · Triggering info · Audit log · Attachments).
  tabs: [
    { id: 'triggering', label: 'Triggering info', remote: 'mfe-fraud', exposedModule: './FraudOverview', order: 1 },
    {
      id: 'audit',
      label: 'Audit log',
      remote: 'mfe-cap-audit-trail',
      exposedModule: './AuditTrail',
      order: 2,
      entitlement: 'case:audit:view',
    },
    {
      id: 'attachments',
      label: 'Attachments',
      remote: 'mfe-cap-attachments',
      exposedModule: './Attachments',
      order: 3,
      entitlement: 'case:attachments:view',
    },
  ],
  // Shown as the FIRST tab. No entitlement: anyone who can see the case sees its decision; recording one needs case:resolve.
  resolution: {
    id: 'decision',
    label: 'Case decision',
    remote: 'mfe-cap-case-resolution',
    exposedModule: './CaseResolution',
    order: 0,
  },
  resolutionCodes: [
    { code: 'FRAUD_CONFIRMED', label: 'Fraud confirmed: suspend line, reverse SIM swap', requiresNote: true },
    { code: 'FRAUD_FALSE_POSITIVE', label: 'False positive: restore service', requiresNote: false },
    { code: 'FRAUD_REFER_LE', label: 'Refer to law enforcement', requiresNote: true },
  ],
};

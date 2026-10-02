/**
 * @file Billing disputes case screen, as data (ADR-0005).
 */
import type { CaseDomainConfig } from '@platform/contracts';

/**
 * Billing disputes case screen, as data (ADR-0005). Adding or removing a tab is a change HERE, never in the layout.
 * Generated with the standard capability tabs; delete the ones this domain does not need.
 */
export const BILLING_DISPUTES_DOMAIN_CONFIG: CaseDomainConfig = {
  domain: 'BILLING_DISPUTE',
  title: 'Billing disputes case',
  queueTitle: 'Billing disputes',
  // ADR-0023: every case screen has the same four tabs (Case decision · Triggering info · Audit log · Attachments).
  tabs: [
    {
      id: 'triggering',
      label: 'Triggering info',
      remote: 'mfe-billing-disputes',
      exposedModule: './BillingDisputesOverview',
      order: 1,
    },
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
    { code: 'DISPUTE_UPHELD', label: 'Upheld: refund the disputed amount', requiresNote: true },
    { code: 'DISPUTE_PARTIAL', label: 'Partially upheld: goodwill credit', requiresNote: true },
    { code: 'DISPUTE_REJECTED', label: 'Rejected: charges are valid', requiresNote: true },
  ],
};

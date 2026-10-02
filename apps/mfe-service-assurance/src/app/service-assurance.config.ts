/**
 * @file Service assurance case screen, as data (ADR-0005).
 */
import type { CaseDomainConfig } from '@platform/contracts';

/**
 * Service assurance case screen, as data (ADR-0005). Adding or removing a tab is a change HERE, never in the layout.
 * Generated with the standard capability tabs; delete the ones this domain does not need.
 */
export const SERVICE_ASSURANCE_DOMAIN_CONFIG: CaseDomainConfig = {
  domain: 'SERVICE_ASSURANCE',
  title: 'Service assurance case',
  queueTitle: 'Service assurance',
  // ADR-0023: every case screen has the same four tabs (Case decision · Triggering info · Audit log · Attachments).
  tabs: [
    {
      id: 'triggering',
      label: 'Triggering info',
      remote: 'mfe-service-assurance',
      exposedModule: './ServiceAssuranceOverview',
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
    { code: 'SVC_FIXED_NETWORK', label: 'Fixed in the network', requiresNote: false },
    { code: 'SVC_DEVICE_ISSUE', label: 'Customer device issue', requiresNote: true },
    { code: 'SVC_NO_FAULT', label: 'No fault found', requiresNote: true },
  ],
};

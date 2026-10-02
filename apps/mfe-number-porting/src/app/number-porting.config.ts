/**
 * @file Number porting case screen, as data (ADR-0005).
 */
import type { CaseDomainConfig } from '@platform/contracts';

/**
 * Number porting case screen, as data (ADR-0005). Adding or removing a tab is a change HERE, never in the layout.
 * Generated with the standard capability tabs; delete the ones this domain does not need.
 */
export const NUMBER_PORTING_DOMAIN_CONFIG: CaseDomainConfig = {
  domain: 'NUMBER_PORTING',
  title: 'Number porting case',
  queueTitle: 'Number porting',
  // ADR-0023: every case screen has the same four tabs (Case decision · Triggering info · Audit log · Attachments).
  tabs: [
    {
      id: 'triggering',
      label: 'Triggering info',
      remote: 'mfe-number-porting',
      exposedModule: './NumberPortingOverview',
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
    { code: 'PORT_COMPLETED', label: 'Port completed', requiresNote: false },
    { code: 'PORT_RESUBMITTED', label: 'Resubmitted with corrected details', requiresNote: true },
    { code: 'PORT_CANCELLED', label: 'Cancelled at customer request', requiresNote: true },
  ],
};

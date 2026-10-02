/**
 * @file Three partner journeys, ONE remote, ONE shared case layout (plan: Phase 3).
 */
import type { CaseDomainConfig, CaseTabDefinition } from '@platform/contracts';

/**
 * Three partner journeys, ONE remote, ONE shared case layout (plan: Phase 3). Each journey is just a
 * different CaseDomainConfig, all with the standard four case tabs (ADR-0023).
 */
const PARTNER_TABS: CaseTabDefinition[] = [
  {
    id: 'triggering',
    label: 'Triggering info',
    remote: 'mfe-partner-oversight',
    exposedModule: './PartnerOversightOverview',
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
];

/** First tab (ADR-0023). No entitlement: viewing a decision is open to case viewers; recording one needs case:resolve. */
const RESOLUTION: CaseTabDefinition = {
  id: 'decision',
  label: 'Case decision',
  remote: 'mfe-cap-case-resolution',
  exposedModule: './CaseResolution',
  order: 0,
};

export const PARTNER_ONBOARDING_CONFIG: CaseDomainConfig = {
  domain: 'PARTNER_ONBOARDING',
  title: 'Dealer onboarding case',
  queueTitle: 'Dealer onboarding',
  tabs: PARTNER_TABS,
  resolution: RESOLUTION,
  resolutionCodes: [
    { code: 'ONB_APPROVED', label: 'Approved: activate dealer', requiresNote: false },
    { code: 'ONB_MORE_INFO', label: 'More information requested', requiresNote: true },
    { code: 'ONB_REJECTED', label: 'Rejected', requiresNote: true },
  ],
};

export const PARTNER_ONGOING_CONFIG: CaseDomainConfig = {
  domain: 'PARTNER_ONGOING',
  title: 'Partner performance case',
  queueTitle: 'Ongoing performance',
  tabs: PARTNER_TABS,
  resolution: RESOLUTION,
  resolutionCodes: [
    { code: 'PERF_ACCEPTABLE', label: 'Performance acceptable', requiresNote: false },
    { code: 'PERF_IMPROVEMENT_PLAN', label: 'Improvement plan agreed', requiresNote: true },
    { code: 'PERF_TERMINATE', label: 'Recommend termination', requiresNote: true },
  ],
};

export const PARTNER_FIELD_AUDIT_CONFIG: CaseDomainConfig = {
  domain: 'PARTNER_FIELD_AUDIT',
  title: 'Field audit case',
  queueTitle: 'Field audits',
  tabs: PARTNER_TABS,
  resolution: RESOLUTION,
  resolutionCodes: [
    { code: 'AUDIT_PASSED', label: 'Passed', requiresNote: false },
    { code: 'AUDIT_FINDINGS', label: 'Passed with findings', requiresNote: true },
    { code: 'AUDIT_FAILED', label: 'Failed: escalate to partner management', requiresNote: true },
  ],
};

export const PARTNER_JOURNEYS = [
  { path: 'onboarding', label: 'Dealer onboarding', config: PARTNER_ONBOARDING_CONFIG },
  { path: 'ongoing', label: 'Ongoing performance', config: PARTNER_ONGOING_CONFIG },
  { path: 'field-audit', label: 'Field audits', config: PARTNER_FIELD_AUDIT_CONFIG },
] as const;

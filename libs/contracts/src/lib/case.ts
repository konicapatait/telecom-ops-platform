/**
 * @file Core case types shared by every MFE: CaseDomain, CaseType, CaseStatus, CaseSummary.
 */
export type CaseDomain =
  | 'FRAUD'
  | 'BILLING_DISPUTE'
  | 'SERVICE_ASSURANCE'
  | 'NUMBER_PORTING'
  | 'PARTNER_ONBOARDING'
  | 'PARTNER_ONGOING'
  | 'PARTNER_FIELD_AUDIT';

/** e.g. 'FRAUD_SIM_SWAP'. The prefix is always the owning domain. */
export type CaseType = `${CaseDomain}_${string}`;

export type CaseStatus = 'NEW' | 'IN_REVIEW' | 'ESCALATED' | 'PENDING_INFO' | 'CLOSED';

export type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CaseSubject {
  /** Account number or partner ID. */
  id: string;
  displayName: string;
  kind: 'SUBSCRIBER' | 'PARTNER';
  /** Phone number, subscriber cases only. */
  msisdn?: string;
}

export interface CaseSummary {
  caseId: string;
  domain: CaseDomain;
  caseType: CaseType;
  status: CaseStatus;
  priority: CasePriority;
  subject: CaseSubject;
  assignee?: { userId: string; displayName: string };
  /** ISO 8601 */
  openedAt: string;
  dueAt?: string;
}

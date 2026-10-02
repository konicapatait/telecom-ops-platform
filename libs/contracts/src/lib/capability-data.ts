/**
 * Data shapes owned by case capabilities (v1). Typed here so mocks, capabilities and the
 * backend share one definition. ADDITIVE changes only.
 */

export type UsageType = 'VOICE' | 'DATA' | 'SMS' | 'TOP_UP' | 'SIM_SWAP' | 'CHARGE';

export interface UsageRecord {
  recordId: string;
  /** ISO 8601 */
  at: string;
  type: UsageType;
  detail: string;
  amount: number;
  currency: string;
  durationSec?: number;
  volumeMb?: number;
  flagged: boolean;
  flagReason?: string;
}

export type AttachmentCategory = 'IDENTITY' | 'EVIDENCE' | 'CORRESPONDENCE' | 'OTHER';

export interface Attachment {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  /** ISO 8601 */
  uploadedAt: string;
  category: AttachmentCategory;
}

export type AuditAction =
  | 'CASE_CREATED'
  | 'CASE_ASSIGNED'
  | 'STATUS_CHANGED'
  | 'TAB_VIEWED'
  | 'ATTACHMENT_ADDED'
  | 'CASE_RESOLVED'
  | 'NOTE_ADDED'
  // v1.2 (additive): workflow transitions and access logging
  | 'WORKFLOW_MOVED'
  | 'CASE_ACCESSED';

/** v1.2 (additive): how the audit log groups events. Tier ⊃ Stage ⊃ Subprocess are workflow levels. */
export type AuditCategory = 'TIER' | 'STAGE' | 'SUBPROCESS' | 'ACTIVITY';

/** Append-only. Written by the backend as a side effect of actions, never by the UI. */
export interface AuditEvent {
  eventId: string;
  /** ISO 8601 */
  at: string;
  actor: string;
  action: AuditAction;
  detail: string;
  /** v1.2 (additive). Missing = 'ACTIVITY'. */
  category?: AuditCategory;
  /** v1.2 (additive): system component that recorded it, e.g. 'Workflow', 'Attachments'. */
  component?: string;
  /** v1.2 (additive): for WORKFLOW_MOVED, the tier/stage/subprocess the case moved to. */
  to?: string;
}

/** Fraud-domain panel data (owned by mfe-fraud). */
export interface FraudRuleHit {
  ruleId: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  /** ISO 8601 */
  at: string;
  evidence: string;
}

export interface FraudOverview {
  caseId: string;
  /** 0–100 */
  riskScore: number;
  riskBand: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  ruleHits: FraudRuleHit[];
}

/** Paged list envelope used by queue/search endpoints. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

// ---- v1.1 (Phase 3), additive ---------------------------------------------------------------

export interface CaseResolution {
  caseId: string;
  code: string;
  note?: string;
  resolvedBy: string;
  /** ISO 8601 */
  resolvedAt: string;
}

export interface Device {
  make: string;
  model: string;
  imei: string;
}

export interface ServiceLine {
  msisdn: string;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PORTED_OUT' | 'CANCELLED';
  simIccid: string;
  /** ISO 8601 */
  activatedAt: string;
  device?: Device;
}

export interface Account {
  accountId: string;
  holder: string;
  segment: 'CONSUMER' | 'SMB' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED' | 'IN_COLLECTIONS' | 'CLOSED';
  /** ISO 8601 */
  customerSince: string;
  billingAddress: string;
  balance: number;
  currency: string;
  lines: ServiceLine[];
}

export interface DisputedItem {
  itemId: string;
  /** ISO 8601 */
  date: string;
  description: string;
  amount: number;
  category: 'ROAMING' | 'PREMIUM_SMS' | 'DATA_OVERAGE' | 'DOUBLE_CHARGE' | 'OTHER';
}

export interface DisputeOverview {
  caseId: string;
  billingPeriod: string;
  disputedAmount: number;
  currency: string;
  customerClaim: string;
  items: DisputedItem[];
}

export interface ServiceKpi {
  name: string;
  value: number;
  unit: string;
  threshold: number;
  breached: boolean;
}

export interface ServiceIncidentOverview {
  caseId: string;
  incidentType: 'OUTAGE' | 'DEGRADATION' | 'DROPPED_CALLS' | 'SLOW_DATA';
  siteId: string;
  region: string;
  /** ISO 8601 */
  startedAt: string;
  affectedSubscribers: number;
  networkTicket?: string;
  kpis: ServiceKpi[];
}

export interface PortingStep {
  name: string;
  status: 'DONE' | 'FAILED' | 'PENDING';
  /** ISO 8601 */
  at?: string;
  detail?: string;
}

export interface PortingOverview {
  caseId: string;
  direction: 'PORT_IN' | 'PORT_OUT';
  msisdn: string;
  donorCarrier: string;
  recipientCarrier: string;
  /** ISO 8601 */
  requestedAt: string;
  rejectionReason?: string;
  steps: PortingStep[];
}

export interface PartnerFinding {
  findingId: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detail: string;
}

export interface PartnerOverview {
  caseId: string;
  partnerId: string;
  name: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  region: string;
  activations30d: number;
  /** 0–100 */
  qualityScore: number;
  /** percent */
  chargebackRate: number;
  findings: PartnerFinding[];
}

// ---- v1.3 (Phase 4), additive ---------------------------------------------------------------

/** A partner (dealer) as the Agent full profile view shows it. */
export interface PartnerProfile {
  partnerId: string;
  name: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  region: string;
  activations30d: number;
  /** 0–100 */
  qualityScore: number;
  /** percent */
  chargebackRate: number;
  findings: PartnerFinding[];
  /** Subscribers linked to this partner (e.g. activated or swapped there). */
  linkedAccountIds: string[];
}

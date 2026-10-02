/**
 * @file Reporting contracts (Phase 5, v1.4, additive): weekly case-volume and SLA series per case domain.
 */
import type { CaseDomain } from './case';

/** One week of one case domain. `week` is the Monday the week starts on (ISO date, UTC). */
export interface CaseVolumePoint {
  week: string;
  domain: CaseDomain;
  opened: number;
  closed: number;
}

export interface SlaPoint {
  week: string;
  domain: CaseDomain;
  /** Cases closed in the week. */
  closed: number;
  /** Of those, closed within their SLA. */
  withinSla: number;
}

/** Query shared by every report endpoint: `?domains=FRAUD,BILLING_DISPUTE&from=2026-07-01&to=2026-09-30`. */
export interface ReportQuery {
  domains: CaseDomain[];
  /** ISO date, inclusive */
  from: string;
  /** ISO date, inclusive */
  to: string;
}

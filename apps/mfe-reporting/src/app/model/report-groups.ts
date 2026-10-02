/**
 * @file Report groups: the five case-management tabs (ADR-0022) as the series every chart and table uses.
 *
 * Each group owns a FIXED categorical colour slot, so filtering never repaints the survivors
 * ("colour follows the entity, never its rank"). Slot order = the validated reference palette order
 * (adjacent CVD ΔE ≥ 8.4, normal-vision ≥ 19.3 in light and dark; contrast relief = legend + table view).
 */
import type { CaseDomain } from '@platform/contracts';

export interface ReportGroup {
  id: 'fraud' | 'disputes' | 'assurance' | 'porting' | 'partners';
  label: string;
  domains: CaseDomain[];
  /** 1-based categorical slot → CSS var --series-<slot> */
  slot: 1 | 2 | 3 | 4 | 5;
}

export const REPORT_GROUPS: readonly ReportGroup[] = [
  { id: 'fraud', label: 'Fraud', domains: ['FRAUD'], slot: 1 },
  { id: 'disputes', label: 'Billing disputes', domains: ['BILLING_DISPUTE'], slot: 2 },
  { id: 'assurance', label: 'Service assurance', domains: ['SERVICE_ASSURANCE'], slot: 3 },
  { id: 'porting', label: 'Number porting', domains: ['NUMBER_PORTING'], slot: 4 },
  {
    id: 'partners',
    label: 'Partner oversight',
    domains: ['PARTNER_ONBOARDING', 'PARTNER_ONGOING', 'PARTNER_FIELD_AUDIT'],
    slot: 5,
  },
];

export function groupOf(domain: CaseDomain): ReportGroup | undefined {
  return REPORT_GROUPS.find((g) => g.domains.includes(domain));
}

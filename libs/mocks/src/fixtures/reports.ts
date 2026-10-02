/**
 * @file Report series fixtures: 26 weeks (Mon 2026-04-06 → Mon 2026-09-28) of case volume and SLA per case domain.
 * Deterministic (seeded) so dashboards, E2E tests and screenshots always show the same numbers.
 */
import type { CaseDomain, CaseVolumePoint, SlaPoint } from '@platform/contracts';
import { seededRandom } from './seeded-random';

export const REPORT_DOMAINS: CaseDomain[] = [
  'FRAUD',
  'BILLING_DISPUTE',
  'SERVICE_ASSURANCE',
  'NUMBER_PORTING',
  'PARTNER_ONBOARDING',
  'PARTNER_ONGOING',
  'PARTNER_FIELD_AUDIT',
];

/** Typical weekly volume and SLA attainment per domain (drives the generator). */
const PROFILE: Record<CaseDomain, { base: number; sla: number }> = {
  FRAUD: { base: 120, sla: 0.91 },
  BILLING_DISPUTE: { base: 210, sla: 0.84 },
  SERVICE_ASSURANCE: { base: 160, sla: 0.88 },
  NUMBER_PORTING: { base: 70, sla: 0.95 },
  PARTNER_ONBOARDING: { base: 18, sla: 0.8 },
  PARTNER_ONGOING: { base: 12, sla: 0.86 },
  PARTNER_FIELD_AUDIT: { base: 9, sla: 0.9 },
};

export const REPORT_WEEKS: string[] = Array.from({ length: 26 }, (_, i) =>
  new Date(Date.UTC(2026, 3, 6) + i * 7 * 86_400_000).toISOString().slice(0, 10),
);

const rand = seededRandom(2026);
export const CASE_VOLUME: CaseVolumePoint[] = [];
export const SLA_SERIES: SlaPoint[] = [];
for (const week of REPORT_WEEKS) {
  const i = REPORT_WEEKS.indexOf(week);
  for (const domain of REPORT_DOMAINS) {
    const { base, sla } = PROFILE[domain];
    // Gentle seasonality + noise; a fraud spike in late September (the SIM-swap ring behind FRD-2026-000142).
    const spike = domain === 'FRAUD' && i >= 23 ? 1.6 : 1;
    const opened = Math.round(base * spike * (0.85 + 0.3 * rand() + 0.1 * Math.sin(i / 3)));
    const closed = Math.round(opened * (0.88 + 0.15 * rand()));
    const withinSla = Math.min(closed, Math.round(closed * (sla - (spike > 1 ? 0.12 : 0) + (rand() - 0.5) * 0.06)));
    CASE_VOLUME.push({ week, domain, opened, closed });
    SLA_SERIES.push({ week, domain, closed, withinSla });
  }
}

/**
 * @file Fraud triggering info (risk score, rule hits) for hero case FRD-2026-000142 plus generated defaults.
 */
import type { FraudOverview } from '@platform/contracts';

export const FRAUD_OVERVIEW_BY_CASE: Record<string, FraudOverview> = {
  'FRD-2026-000142': {
    caseId: 'FRD-2026-000142',
    riskScore: 94,
    riskBand: 'CRITICAL',
    summary:
      'SIM swap at an out-of-region dealer, followed within 34 minutes by a new-card top-up and a 41-minute premium-rate call.',
    ruleHits: [
      {
        ruleId: 'R-SIM-07',
        name: 'SIM swap outside home region',
        severity: 'HIGH',
        at: '2026-09-21T02:14:00Z',
        evidence: 'EVT-9001 · Dealer 55102 (Denver) vs home region Boulder',
      },
      {
        ruleId: 'R-TOP-02',
        name: 'Top-up < 60 min after SIM swap',
        severity: 'HIGH',
        at: '2026-09-21T02:31:00Z',
        evidence: 'EVT-9002 · $100.00 by card never seen on account',
      },
      {
        ruleId: 'R-IRSF-11',
        name: 'Premium-rate international destination',
        severity: 'MEDIUM',
        at: '2026-09-21T02:48:00Z',
        evidence: 'EVT-9003 · 41m to +882 range',
      },
    ],
  },
};

export function fraudOverviewFor(caseId: string): FraudOverview {
  return (
    FRAUD_OVERVIEW_BY_CASE[caseId] ?? {
      caseId,
      riskScore: 40 + ([...caseId].reduce((s, c) => s + c.charCodeAt(0), 0) % 50),
      riskBand: 'MEDIUM',
      summary: 'Automated alert. No analyst summary yet.',
      ruleHits: [
        {
          ruleId: 'R-GEN-01',
          name: 'Velocity anomaly',
          severity: 'MEDIUM',
          at: '2026-09-25T08:00:00Z',
          evidence: 'Usage above 3σ of 90-day baseline',
        },
      ],
    }
  );
}

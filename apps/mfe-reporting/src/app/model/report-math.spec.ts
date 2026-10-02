import type { CaseVolumePoint, SlaPoint } from '@platform/contracts';
import { groupWeekRows, openedSeries, slaByGroup, toCsv, totals } from './report-math';

const VOLUME: CaseVolumePoint[] = [
  { week: '2026-09-21', domain: 'FRAUD', opened: 100, closed: 90 },
  { week: '2026-09-21', domain: 'PARTNER_ONGOING', opened: 5, closed: 4 },
  { week: '2026-09-21', domain: 'PARTNER_FIELD_AUDIT', opened: 3, closed: 2 },
  { week: '2026-09-28', domain: 'FRAUD', opened: 160, closed: 120 },
];
const SLA: SlaPoint[] = [
  { week: '2026-09-21', domain: 'FRAUD', closed: 90, withinSla: 81 },
  { week: '2026-09-21', domain: 'PARTNER_ONGOING', closed: 4, withinSla: 4 },
  { week: '2026-09-21', domain: 'PARTNER_FIELD_AUDIT', closed: 2, withinSla: 1 },
  { week: '2026-09-28', domain: 'FRAUD', closed: 120, withinSla: 96 },
];

describe('report math', () => {
  const rows = groupWeekRows(VOLUME, SLA);

  it('sums partner journeys into one "Partner oversight" row per week', () => {
    expect(rows.map((r) => `${r.week} ${r.group.id} ${r.opened}/${r.closed}/${r.withinSla}`)).toEqual([
      '2026-09-21 fraud 100/90/81',
      '2026-09-21 partners 8/6/5',
      '2026-09-28 fraud 160/120/96',
    ]);
  });

  it('computes totals and SLA %', () => {
    expect(totals(rows)).toEqual({ opened: 268, closed: 216, withinSla: 182, breached: 34, slaPct: (182 / 216) * 100 });
    expect(totals([]).slaPct).toBeNull();
  });

  it('zero-fills weekly series on shared weeks', () => {
    const s = openedSeries(rows);
    expect(s.weeks).toEqual(['2026-09-21', '2026-09-28']);
    expect(s.series.map((x) => [x.group.id, x.values])).toEqual([
      ['fraud', [100, 160]],
      ['partners', [8, 0]],
    ]);
  });

  it('gives SLA per group in group order', () => {
    expect(slaByGroup(rows).map((x) => [x.group.id, x.totals.breached])).toEqual([
      ['fraud', 33],
      ['partners', 1],
    ]);
  });

  it('exports RFC 4180 CSV, newest week first', () => {
    const csv = toCsv(rows).split('\r\n');
    expect(csv[0]).toBe('Week starting,Case domain,Opened,Closed,Closed within SLA,Within SLA %');
    expect(csv[1]).toBe('2026-09-28,Fraud,160,120,96,80.0');
    expect(csv).toHaveLength(rows.length + 2); // header + rows + trailing newline
  });
});

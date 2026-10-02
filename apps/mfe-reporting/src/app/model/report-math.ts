/**
 * @file Pure aggregation for the dashboard: series per group and week, headline totals, SLA by group, table rows, CSV.
 * No Angular here, so it is trivially unit-tested and every view (tiles, charts, table, export) agrees.
 */
import type { CaseVolumePoint, SlaPoint } from '@platform/contracts';
import { REPORT_GROUPS, groupOf, type ReportGroup } from './report-groups';

export interface GroupWeekRow {
  week: string;
  group: ReportGroup;
  opened: number;
  closed: number;
  withinSla: number;
}

/** One row per (week, group): partner journeys are summed into "Partner oversight". Sorted by week, then group order. */
export function groupWeekRows(volume: readonly CaseVolumePoint[], sla: readonly SlaPoint[]): GroupWeekRow[] {
  const rows = new Map<string, GroupWeekRow>();
  const row = (week: string, group: ReportGroup) => {
    const key = `${week}|${group.id}`;
    if (!rows.has(key)) rows.set(key, { week, group, opened: 0, closed: 0, withinSla: 0 });
    return rows.get(key) as GroupWeekRow;
  };
  for (const v of volume) {
    const g = groupOf(v.domain);
    if (!g) continue;
    const r = row(v.week, g);
    r.opened += v.opened;
    r.closed += v.closed;
  }
  for (const s of sla) {
    const g = groupOf(s.domain);
    if (g) row(s.week, g).withinSla += s.withinSla;
  }
  return [...rows.values()].sort(
    (a, b) => a.week.localeCompare(b.week) || REPORT_GROUPS.indexOf(a.group) - REPORT_GROUPS.indexOf(b.group),
  );
}

export interface Totals {
  opened: number;
  closed: number;
  withinSla: number;
  breached: number;
  /** 0–100, null when nothing closed */
  slaPct: number | null;
}

export function totals(rows: readonly GroupWeekRow[]): Totals {
  const opened = rows.reduce((n, r) => n + r.opened, 0);
  const closed = rows.reduce((n, r) => n + r.closed, 0);
  const withinSla = rows.reduce((n, r) => n + r.withinSla, 0);
  return {
    opened,
    closed,
    withinSla,
    breached: closed - withinSla,
    slaPct: closed ? (withinSla / closed) * 100 : null,
  };
}

/** Weekly "opened" series per group, for the line chart (weeks shared across series, zero-filled). */
export function openedSeries(rows: readonly GroupWeekRow[]): {
  weeks: string[];
  series: { group: ReportGroup; values: number[] }[];
} {
  const weeks = [...new Set(rows.map((r) => r.week))].sort();
  const groups = REPORT_GROUPS.filter((g) => rows.some((r) => r.group === g));
  return {
    weeks,
    series: groups.map((group) => ({
      group,
      values: weeks.map((w) => rows.find((r) => r.week === w && r.group === group)?.opened ?? 0),
    })),
  };
}

/** SLA attainment per group over the whole range, for the bar chart. */
export function slaByGroup(rows: readonly GroupWeekRow[]): { group: ReportGroup; totals: Totals }[] {
  return REPORT_GROUPS.filter((g) => rows.some((r) => r.group === g)).map((group) => ({
    group,
    totals: totals(rows.filter((r) => r.group === group)),
  }));
}

/** RFC 4180 CSV of the table rows (newest week first, like the table). */
export function toCsv(rows: readonly GroupWeekRow[]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Week starting', 'Case domain', 'Opened', 'Closed', 'Closed within SLA', 'Within SLA %'];
  const body = [...rows]
    .sort((a, b) => b.week.localeCompare(a.week) || REPORT_GROUPS.indexOf(a.group) - REPORT_GROUPS.indexOf(b.group))
    .map((r) => [
      r.week,
      r.group.label,
      r.opened,
      r.closed,
      r.withinSla,
      r.closed ? ((r.withinSla / r.closed) * 100).toFixed(1) : '',
    ]);
  return [header, ...body].map((line) => line.map(cell).join(',')).join('\r\n') + '\r\n';
}

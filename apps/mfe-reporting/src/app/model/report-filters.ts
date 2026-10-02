/**
 * @file Dashboard filters ⇄ URL query params (?groups=fraud,disputes&from=2026-07-01&to=2026-09-30) and date presets.
 * Filters live in the URL so a dashboard view can be bookmarked and shared.
 */
import { REPORT_GROUPS, type ReportGroup } from './report-groups';

export const PRESETS = [
  { id: 'last-4', label: 'Last 4 weeks', weeks: 4 },
  { id: 'last-13', label: 'Last 13 weeks', weeks: 13 },
  { id: 'last-26', label: 'Last 26 weeks', weeks: 26 },
] as const;
export type PresetId = (typeof PRESETS)[number]['id'] | 'custom';
export const DEFAULT_PRESET: PresetId = 'last-13';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Inclusive range ending today (UTC), `weeks` × 7 days long. */
export function presetRange(id: Exclude<PresetId, 'custom'>, today = new Date()): { from: string; to: string } {
  const weeks = PRESETS.find((p) => p.id === id)?.weeks ?? 13;
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(to.getTime() - (weeks * 7 - 1) * 86_400_000);
  return { from: iso(from), to: iso(to) };
}

/** Which preset (if any) a range corresponds to today. */
export function presetOf(from: string, to: string, today = new Date()): PresetId {
  return (
    PRESETS.find((p) => {
      const r = presetRange(p.id, today);
      return r.from === from && r.to === to;
    })?.id ?? 'custom'
  );
}

/** `groups` query param → groups (unknown ids ignored; empty/absent = all). */
export function parseGroups(param: string | undefined): ReportGroup[] {
  if (param === undefined || param === '') return [...REPORT_GROUPS];
  if (param === 'none') return [];
  const ids = param.split(',');
  return REPORT_GROUPS.filter((g) => ids.includes(g.id));
}

export function groupsParam(groups: readonly ReportGroup[]): string | null {
  if (groups.length === REPORT_GROUPS.length) return null; // default → keep the URL clean
  return groups.length ? groups.map((g) => g.id).join(',') : 'none';
}

export const isIsoDate = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

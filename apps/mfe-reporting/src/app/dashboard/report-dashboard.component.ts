/**
 * @file The Reports dashboard (Phase 5): filter bar → stat tiles → case-volume line chart + SLA bar chart → report table.
 *
 * The reporting family keeps its layout inside this app (ADR-0002). Filters scope everything below them and live
 * in the URL. While data reloads the previous frame stays on screen (dimmed): no skeleton flash.
 * Report loads are logged with timings (source `reporting`, ADR-0025).
 */
import { DecimalPipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DsButton, DsEmptyState } from '@org/design-system';
import type { CaseVolumePoint, SlaPoint } from '@platform/contracts';
import { createLogger } from '@platform/utils';
import { Observable, catchError, of, tap, throwError } from 'rxjs';
import { SlaChartComponent } from '../charts/sla-chart.component';
import { VolumeChartComponent } from '../charts/volume-chart.component';
import {
  DEFAULT_PRESET,
  PRESETS,
  groupsParam,
  isIsoDate,
  parseGroups,
  presetOf,
  presetRange,
  type PresetId,
} from '../model/report-filters';
import { REPORT_GROUPS, type ReportGroup } from '../model/report-groups';
import { groupWeekRows, openedSeries, slaByGroup, toCsv, totals, type GroupWeekRow } from '../model/report-math';

const log = createLogger('reporting');
/** SLA attainment target shown on the chart and used for the tile's status. */
export const SLA_TARGET = 90;

@Component({
  selector: 'reporting-dashboard',
  imports: [DecimalPipe, DsButton, DsEmptyState, VolumeChartComponent, SlaChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-dashboard.component.html',
  styleUrl: './report-dashboard.component.css',
})
export class ReportDashboardComponent {
  /** Query params (withComponentInputBinding). */
  readonly groups = input<string>();
  readonly from = input<string>();
  readonly to = input<string>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly allGroups = REPORT_GROUPS;
  protected readonly presets = PRESETS;
  protected readonly target = SLA_TARGET;

  protected readonly selected = computed(() => parseGroups(this.groups()));
  protected readonly range = computed(() => {
    const def = presetRange(DEFAULT_PRESET as Exclude<PresetId, 'custom'>);
    const from = isIsoDate(this.from()) ? this.from()! : def.from;
    const to = isIsoDate(this.to()) ? this.to()! : def.to;
    return from <= to ? { from, to } : { from: to, to: from };
  });
  protected readonly preset = computed(() => presetOf(this.range().from, this.range().to));

  private readonly query = computed(() => ({
    domains: this.selected().flatMap((g) => g.domains),
    from: this.range().from,
    to: this.range().to,
  }));

  private readonly volume = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.fetch<CaseVolumePoint>('case-volume', params),
  });
  private readonly sla = rxResource({
    params: () => this.query(),
    stream: ({ params }) => this.fetch<SlaPoint>('sla', params),
  });

  protected readonly loading = computed(() => this.volume.isLoading() || this.sla.isLoading());
  protected readonly error = computed(() => (this.volume.error() ?? this.sla.error()) as HttpErrorResponse | undefined);

  /** Last complete data set: kept while a refetch is in flight ("refetch keeps the frame"). */
  protected readonly rows = linkedSignal<{ v?: CaseVolumePoint[]; s?: SlaPoint[] }, GroupWeekRow[] | null>({
    source: () => ({ v: this.volume.value(), s: this.sla.value() }),
    computation: (src, previous) => (src.v && src.s ? groupWeekRows(src.v, src.s) : (previous?.value ?? null)),
  });

  protected readonly totals = computed(() => totals(this.rows() ?? []));
  protected readonly series = computed(() => openedSeries(this.rows() ?? []));
  protected readonly slaRows = computed(() => slaByGroup(this.rows() ?? []));
  /** Table: newest week first. */
  protected readonly tableRows = computed(() =>
    [...(this.rows() ?? [])].sort(
      (a, b) => b.week.localeCompare(a.week) || REPORT_GROUPS.indexOf(a.group) - REPORT_GROUPS.indexOf(b.group),
    ),
  );

  private fetch<T>(name: 'case-volume' | 'sla', q: { domains: string[]; from: string; to: string }): Observable<T[]> {
    if (!q.domains.length) return of([]);
    const start = performance.now();
    return this.http
      .get<T[]>(`/api/reports/${name}`, { params: { domains: q.domains.join(','), from: q.from, to: q.to } })
      .pipe(
        tap((rows) =>
          log.info('Report data loaded', {
            report: name,
            rows: rows.length,
            from: q.from,
            to: q.to,
            domains: q.domains.length,
            durationMs: Math.round(performance.now() - start),
          }),
        ),
        catchError((err: unknown) => {
          log.warn('Report data failed to load', {
            report: name,
            from: q.from,
            to: q.to,
            status: (err as HttpErrorResponse)?.status,
          });
          return throwError(() => err);
        }),
      );
  }

  // ---- filter actions (all go through the URL) ----

  protected choosePreset(id: string): void {
    if (id === 'custom') return;
    this.navigate(presetRange(id as Exclude<PresetId, 'custom'>));
  }

  protected setDate(which: 'from' | 'to', value: string): void {
    if (isIsoDate(value)) this.navigate({ ...this.range(), [which]: value });
  }

  protected toggle(group: ReportGroup, on: boolean): void {
    const next = REPORT_GROUPS.filter((g) => (g === group ? on : this.selected().includes(g)));
    this.navigate({ ...this.range(), groups: groupsParam(next) });
  }

  protected isSelected(group: ReportGroup): boolean {
    return this.selected().includes(group);
  }

  private navigate(params: { from: string; to: string; groups?: string | null }): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        from: params.from,
        to: params.to,
        groups: params.groups === undefined ? groupsParam(this.selected()) : params.groups,
      },
      replaceUrl: true,
    });
  }

  protected retry(): void {
    this.volume.reload();
    this.sla.reload();
  }

  protected exportCsv(): void {
    const rows = this.rows() ?? [];
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `case-report_${this.range().from}_${this.range().to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    log.info('Report exported as CSV', { rows: rows.length, from: this.range().from, to: this.range().to });
  }
}

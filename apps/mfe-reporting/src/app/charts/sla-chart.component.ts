/**
 * @file Horizontal bar chart: share of cases closed within SLA, per report group (compare categories → bars).
 *
 * One measure, one axis (0–100 %), a dashed target line, value labels at the bar end in text colour, bars in the
 * group's fixed colour (same identity as the line chart) with the category named on the axis, 4px rounded data end
 * anchored at the baseline, 2px gaps. Each bar is a focusable hit target with its own tooltip.
 */
import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ReportGroup } from '../model/report-groups';
import type { Totals } from '../model/report-math';
import { observeWidth } from './chart-size';

const BAR = 26;
const GAP = 10;
const M = { top: 22, bottom: 24, left: 140, right: 64 };

@Component({
  selector: 'reporting-sla-chart',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sla-chart.component.html',
  styleUrl: './chart.css',
})
export class SlaChartComponent {
  readonly rows = input.required<{ group: ReportGroup; totals: Totals }[]>();
  /** Target attainment, e.g. 90 (%). */
  readonly target = input(90);

  protected readonly width = observeWidth();
  protected readonly m = M;
  protected readonly bar = BAR;
  protected readonly hover = signal<string | null>(null);
  protected readonly plotW = computed(() => Math.max(60, this.width() - M.left - M.right));
  protected readonly height = computed(() => M.top + this.rows().length * (BAR + GAP) + M.bottom);
  protected readonly ticks = [0, 25, 50, 75, 100];

  protected x(pct: number): number {
    return M.left + (pct / 100) * this.plotW();
  }
  protected y(i: number): number {
    return M.top + i * (BAR + GAP);
  }

  /** Bar with a 4px rounded END only (the baseline side stays square). */
  protected barPath(i: number, pct: number): string {
    const x0 = M.left;
    const x1 = Math.max(x0 + 1, this.x(pct));
    const y0 = this.y(i);
    const r = Math.min(4, (x1 - x0) / 2);
    return `M${x0},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y0 + BAR - r}Q${x1},${y0 + BAR} ${x1 - r},${y0 + BAR}H${x0}Z`;
  }

  protected pct(t: Totals): number {
    return t.slaPct ?? 0;
  }

  protected readonly tip = computed(() => {
    const id = this.hover();
    const i = this.rows().findIndex((r) => r.group.id === id);
    if (i < 0) return null;
    const r = this.rows()[i];
    return { r, top: this.y(i) + BAR + 4, left: Math.min(this.x(this.pct(r.totals)) - 60, this.width() - 210) };
  });
}

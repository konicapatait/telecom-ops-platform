/**
 * @file Line chart: cases opened per week, one line per report group (change over time → line).
 *
 * Follows the platform's data-viz rules: 2px lines, fixed colour per group (never re-coloured by filtering),
 * one y-axis, recessive grid, a legend for ≥ 2 series plus direct end labels for ≤ 4, a crosshair that snaps
 * to the nearest week with ONE tooltip listing every series (values lead, names follow), keyboard access
 * (←/→ move the crosshair, Esc hides it). The report table below is the non-visual view of the same data.
 */
import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import type { ReportGroup } from '../model/report-groups';
import { niceMax, observeWidth, shortWeek } from './chart-size';

const H = 280;
const M = { top: 16, bottom: 28, left: 48 };

@Component({
  selector: 'reporting-volume-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './volume-chart.component.html',
  styleUrl: './chart.css',
})
export class VolumeChartComponent {
  readonly weeks = input.required<string[]>();
  readonly series = input.required<{ group: ReportGroup; values: number[] }[]>();

  protected readonly width = observeWidth();
  protected readonly height = H;
  protected readonly hover = signal<number | null>(null);
  protected readonly short = shortWeek;

  /** Direct end labels only for ≤ 4 series; they need right margin. */
  protected readonly directLabels = computed(() => this.series().length > 0 && this.series().length <= 4);
  private readonly right = computed(() => (this.directLabels() ? 132 : 16));
  protected readonly plotW = computed(() => Math.max(40, this.width() - M.left - this.right()));
  protected readonly plotH = H - M.top - M.bottom;
  protected readonly m = M;

  protected readonly yMax = computed(() => niceMax(Math.max(1, ...this.series().flatMap((s) => s.values)) * 1.05));
  protected readonly yTicks = computed(() => [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(this.yMax() * f)));

  protected x(i: number): number {
    const n = this.weeks().length;
    return M.left + (n <= 1 ? this.plotW() / 2 : (i / (n - 1)) * this.plotW());
  }
  protected y(v: number): number {
    return M.top + this.plotH - (v / this.yMax()) * this.plotH;
  }

  protected readonly paths = computed(() =>
    this.series().map((s) => ({
      group: s.group,
      d: s.values.map((v, i) => `${i ? 'L' : 'M'}${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`).join(''),
    })),
  );

  /** Every ~6th week labelled, so labels never collide. */
  protected readonly xLabels = computed(() => {
    const n = this.weeks().length;
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(this.plotW() / 90))));
    // Always label the last week; drop a regular label that would sit within ~70px of it (no collisions).
    const lastX = this.x(n - 1);
    return this.weeks()
      .map((w, i) => ({ i, label: shortWeek(w) }))
      .filter(({ i }) => i === n - 1 || (i % every === 0 && lastX - this.x(i) >= 70));
  });

  /** End labels, nudged apart vertically (≥ 14px) so they never overlap. */
  protected readonly endLabels = computed(() => {
    const last = this.weeks().length - 1;
    const items = this.series()
      .map((s) => ({ group: s.group, value: s.values[last] ?? 0, y: this.y(s.values[last] ?? 0) }))
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < items.length; i++) items[i].y = Math.max(items[i].y, items[i - 1].y + 14);
    return items;
  });

  protected readonly tooltip = computed(() => {
    const i = this.hover();
    if (i === null || !this.weeks().length) return null;
    const left = this.x(i);
    return {
      i,
      week: this.weeks()[i],
      left: Math.min(left + 12, this.width() - 190),
      rows: this.series()
        .map((s) => ({ group: s.group, value: s.values[i] ?? 0 }))
        .sort((a, b) => b.value - a.value),
    };
  });

  protected onPointer(event: PointerEvent): void {
    const svg = (event.currentTarget as SVGElement).getBoundingClientRect();
    const px = event.clientX - svg.left;
    const n = this.weeks().length;
    if (!n) return;
    const i = n === 1 ? 0 : Math.round(((px - M.left) / this.plotW()) * (n - 1));
    this.hover.set(Math.min(n - 1, Math.max(0, i)));
  }

  protected onKey(event: KeyboardEvent): void {
    const n = this.weeks().length;
    if (!n) return;
    const cur = this.hover() ?? n - 1;
    if (event.key === 'ArrowRight') this.hover.set(Math.min(n - 1, cur + 1));
    else if (event.key === 'ArrowLeft') this.hover.set(Math.max(0, cur - 1));
    else if (event.key === 'Escape') this.hover.set(null);
    else return;
    event.preventDefault();
  }
}

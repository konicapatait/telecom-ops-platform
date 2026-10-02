/**
 * @file Tracks an element's width as a signal (ResizeObserver), so SVG charts re-layout on resize.
 */
import { DestroyRef, ElementRef, afterNextRender, inject, signal } from '@angular/core';

export function observeWidth(fallback = 640) {
  const host = inject(ElementRef<HTMLElement>);
  const destroyRef = inject(DestroyRef);
  const width = signal(fallback);
  afterNextRender(() => {
    const el = host.nativeElement as HTMLElement;
    width.set(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => width.set(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}

/** A "nice" axis maximum just above `value`: 1, 1.5, 2, 3, 4, 5, 6, 8 or 10 × 10^n (keeps headroom under ~33%). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const step = [1, 1.5, 2, 3, 4, 5, 6, 8, 10].find((s) => f <= s) ?? 10;
  return step * exp;
}

export function shortWeek(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

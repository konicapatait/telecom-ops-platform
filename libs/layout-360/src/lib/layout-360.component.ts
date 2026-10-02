/**
 * @file Level-2 family layout for every 360 view (ADR-0002, ADR-0024): profile banner → KPI strip → section grid.
 */
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChildren, inject, input } from '@angular/core';
import { DsBadge } from '@org/design-system';
import { EntitlementsService } from '@platform/entitlements';
import { PanelHostComponent } from './panel-host.component';
import { L360SectionDirective } from './section.directive';
import type { Kpi360, Profile360, Section360 } from './layout-360.types';

/**
 * Level-2 family layout for every 360 view (ADR-0002, ADR-0024): profile banner → KPI strip → section grid.
 * Sections are configuration; capability sections get only the `panelInputs` they list.
 */
@Component({
  selector: 'l360-layout',
  imports: [DsBadge, NgTemplateOutlet, PanelHostComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout-360.component.html',
  styleUrl: './layout-360.component.css',
})
export class Layout360Component {
  readonly profile = input.required<Profile360>();
  readonly kpis = input<Kpi360[]>([]);
  readonly sections = input.required<Section360[]>();
  readonly panelInputs = input<Readonly<Record<string, unknown>>>({});

  private readonly entitlements = inject(EntitlementsService);
  private readonly localSections = contentChildren(L360SectionDirective);

  protected readonly visibleSections = computed(() =>
    this.sections().filter((s) => this.entitlements.has(s.entitlement)),
  );

  protected templateFor(id: string) {
    return this.localSections().find((d) => d.l360Section() === id)?.template ?? null;
  }

  protected inputsFor(section: Section360): Record<string, unknown> {
    const all = this.panelInputs();
    return Object.fromEntries((section.inputs ?? []).filter((k) => k in all).map((k) => [k, all[k]]));
  }
}

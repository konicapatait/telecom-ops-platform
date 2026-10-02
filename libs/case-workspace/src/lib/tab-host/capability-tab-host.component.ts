/**
 * @file Mounts ONE capability remote (ADR-0004).
 */
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ViewContainerRef,
  afterNextRender,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DsEmptyState, DsSkeleton } from '@org/design-system';
import type { CaseTabDefinition, CaseType } from '@platform/contracts';
import { RemoteLoadError, loadCapability } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';

const log = createLogger('case-workspace');

/**
 * Mounts ONE capability remote (ADR-0004). Created on first tab open and kept alive by the case view;
 * case changes re-push inputs to the same instance. A failed remote shows "unavailable" + Retry in THIS tab only.
 */
@Component({
  selector: 'cw-capability-tab-host',
  imports: [DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-remote]': 'tab().remote', '[attr.data-state]': 'state()' },
  template: `
    @switch (state()) {
      @case ('loading') {
        <ds-skeleton variant="panel" />
      }
      @case ('error') {
        <ds-empty-state
          icon="warning"
          heading="This section is unavailable"
          [message]="tab().label + ' could not be loaded. The rest of the case still works.'"
          actionLabel="Retry"
          (action)="load()"
        />
      }
    }
    <ng-container #outlet />
  `,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class CapabilityTabHostComponent {
  readonly tab = input.required<CaseTabDefinition>();
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  /**
   * Extra inputs for this capability beyond caseId/caseType, e.g. `{ resolutionCodes }` for the resolution
   * capability (CaseResolutionInputs, ADR-0020). Keep it small and typed in @platform/contracts.
   */
  readonly inputs = input<Readonly<Record<string, unknown>>>({});

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private ref?: ComponentRef<unknown>;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    afterNextRender(() => void this.load()); // the outlet exists now
    effect(() => {
      const caseId = this.caseId();
      const caseType = this.caseType();
      const extra = this.inputs();
      this.ref?.setInput('caseId', caseId);
      this.ref?.setInput('caseType', caseType);
      for (const [name, value] of Object.entries(extra)) this.ref?.setInput(name, value);
    });
  }

  async load(): Promise<void> {
    this.state.set('loading');
    const start = performance.now();
    try {
      const component = await loadCapability(this.tab().remote, this.tab().exposedModule);
      this.outlet().clear();
      this.ref = this.outlet().createComponent(component);
      this.ref.setInput('caseId', this.caseId());
      this.ref.setInput('caseType', this.caseType());
      for (const [name, value] of Object.entries(this.inputs())) this.ref.setInput(name, value);
      this.state.set('ready');
      log.debug('Case tab ready', {
        tab: this.tab().id,
        remote: this.tab().remote,
        caseId: this.caseId(),
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e) {
      // The loader already logged WARN "Remote failed to load" (code, hint, traceId); add WHERE it surfaced.
      this.state.set('error');
      log.warn('Case tab unavailable', {
        tab: this.tab().id,
        remote: this.tab().remote,
        caseId: this.caseId(),
        traceId: e instanceof RemoteLoadError ? e.traceId : undefined,
      });
    }
  }
}

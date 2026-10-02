/**
 * @file Loads ONE capability remote into a 360 section.
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
import type { RemoteName } from '@platform/contracts';
import { RemoteLoadError, loadCapability } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';

const log = createLogger('layout-360');

/** Loads ONE capability remote into a 360 section. Failure stays inside this panel (Retry in place). */
@Component({
  selector: 'l360-panel-host',
  imports: [DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-remote]': 'remote()', '[attr.data-state]': 'state()' },
  template: `
    @switch (state()) {
      @case ('loading') {
        <ds-skeleton variant="panel" />
      }
      @case ('error') {
        <ds-empty-state icon="warning" heading="This panel is unavailable" actionLabel="Retry" (action)="load()" />
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
export class PanelHostComponent {
  readonly remote = input.required<RemoteName>();
  readonly exposedModule = input.required<string>();
  readonly inputs = input<Readonly<Record<string, unknown>>>({});

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private ref?: ComponentRef<unknown>;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    afterNextRender(() => void this.load());
    effect(() => {
      const values = this.inputs();
      for (const [k, v] of Object.entries(values)) this.ref?.setInput(k, v);
    });
  }

  async load(): Promise<void> {
    this.state.set('loading');
    const start = performance.now();
    try {
      const component = await loadCapability(this.remote(), this.exposedModule());
      this.outlet().clear();
      this.ref = this.outlet().createComponent(component);
      for (const [k, v] of Object.entries(this.inputs())) this.ref.setInput(k, v);
      this.state.set('ready');
      log.debug('360 panel ready', {
        remote: this.remote(),
        exposedModule: this.exposedModule(),
        durationMs: Math.round(performance.now() - start),
      });
    } catch (e) {
      this.state.set('error');
      log.warn('360 panel unavailable', {
        remote: this.remote(),
        exposedModule: this.exposedModule(),
        traceId: e instanceof RemoteLoadError ? e.traceId : undefined,
      });
    }
  }
}

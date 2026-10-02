/**
 * @file Embeds one capability remote outside the case screen (header search, Home case search) with in-place fallback.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  ViewContainerRef,
  afterNextRender,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { DsEmptyState, DsSkeleton } from '@org/design-system';
import type { RemoteName } from '@platform/contracts';
import { RemoteLoadError, loadCapability } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';

const log = createLogger('shell');

/**
 * Embeds ONE capability remote outside the case screen (e.g. case search on Home).
 * Same isolation as the case tab host: a failed remote shows "unavailable" + Retry in this slot only.
 */
@Component({
  selector: 'shell-capability-slot',
  imports: [DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-remote]': 'remote()', '[attr.data-state]': 'state()' },
  template: `
    @switch (state()) {
      @case ('loading') {
        <ds-skeleton />
      }
      @case ('error') {
        <ds-empty-state icon="warning" [heading]="label() + ' is unavailable'" actionLabel="Retry" (action)="load()" />
      }
    }
    <ng-container #outlet />
  `,
})
export class CapabilitySlotComponent {
  readonly remote = input.required<RemoteName>();
  readonly exposedModule = input.required<string>();
  readonly label = input('This section');
  readonly inputs = input<Readonly<Record<string, unknown>>>({});
  /** Header-sized: no skeleton, one-line error with Retry. */
  readonly compact = input(false);

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private ref?: ComponentRef<unknown>;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    afterNextRender(() => void this.load());
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const component = await loadCapability(this.remote(), this.exposedModule());
      this.outlet().clear();
      this.ref = this.outlet().createComponent(component);
      for (const [k, v] of Object.entries(this.inputs())) this.ref.setInput(k, v);
      this.state.set('ready');
      log.debug('Embedded capability ready', { remote: this.remote(), exposedModule: this.exposedModule() });
    } catch (e) {
      this.state.set('error');
      log.warn('Embedded capability unavailable', {
        remote: this.remote(),
        slot: this.label(),
        traceId: e instanceof RemoteLoadError ? e.traceId : undefined,
        code: e instanceof RemoteLoadError ? e.code : undefined,
      });
    }
  }
}

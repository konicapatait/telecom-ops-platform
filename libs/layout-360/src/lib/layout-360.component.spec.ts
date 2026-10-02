import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EntitlementsService } from '@platform/entitlements';
import { Layout360Component } from './layout-360.component';
import { L360SectionDirective } from './section.directive';
import { PanelHostComponent } from './panel-host.component';
import type { Section360 } from './layout-360.types';

@Component({
  selector: 'l360-panel-host',
  template: `{{ remote() }}|{{ json() }}`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class FakePanelHost {
  readonly remote = input<string>();
  readonly exposedModule = input<string>();
  readonly inputs = input<Record<string, unknown>>({});
  json = () => JSON.stringify(this.inputs());
}

const SECTIONS = [
  {
    id: 'account',
    title: 'Account',
    span: 2,
    remote: 'mfe-cap-account-view',
    exposedModule: './AccountView',
    inputs: ['accountId'],
  },
  { id: 'cases', title: 'Open cases', span: 1 },
  { id: 'secret', title: 'Secret', span: 1, entitlement: 'nope' },
] as unknown as Section360[];

@Component({
  imports: [Layout360Component, L360SectionDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <l360-layout
      [profile]="{ title: 'Maria Delgado', badges: [{ label: 'Subscriber' }] }"
      [kpis]="[{ label: 'Balance', value: '$232.40' }]"
      [sections]="sections"
      [panelInputs]="{ accountId: 'ACC-884210', other: 1 }"
    >
      <ng-template l360Section="cases"><p class="local">local cases panel</p></ng-template>
    </l360-layout>
  `,
})
class Host {
  sections = SECTIONS;
}

describe('Layout360Component', () => {
  it('renders banner, KPIs, capability sections with only their inputs, and local sections; hides unentitled ones', async () => {
    TestBed.configureTestingModule({}).overrideComponent(Layout360Component, {
      remove: { imports: [PanelHostComponent] },
      add: { imports: [FakePanelHost] },
    });
    TestBed.inject(EntitlementsService).set({ entitlements: [], featureFlags: {} });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Maria Delgado');
    expect(el.querySelector('.l360__kpi')?.textContent).toContain('$232.40');
    expect([...el.querySelectorAll('.l360__section-title')].map((h) => h.textContent)).toEqual([
      'Account',
      'Open cases',
    ]);
    expect(el.querySelector('l360-panel-host')?.textContent).toBe('mfe-cap-account-view|{"accountId":"ACC-884210"}');
    expect(el.querySelector('.local')?.textContent).toBe('local cases panel');
  });
});

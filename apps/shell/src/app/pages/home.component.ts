/**
 * @file Home: case search and a card per section the user can open.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DsBadge } from '@org/design-system';
import { AuthService } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { isRemoteDeployed } from '@platform/mf-manifest';
import { CapabilitySlotComponent } from '../chrome/capability-slot.component';
import { SHELL_REMOTE_ROUTES } from '../routing/remote-registry';
import { visibleNavItems } from '../routing/nav';

@Component({
  selector: 'shell-home',
  imports: [RouterLink, DsBadge, CapabilitySlotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Welcome{{ auth.user() ? ', ' + auth.user()!.displayName : '' }}</h1>
    @if (caseSearchDeployed) {
      <section class="home__search" aria-labelledby="find-case">
        <h2 id="find-case" class="home__h">Find a case</h2>
        <shell-capability-slot remote="mfe-cap-case-search" exposedModule="./CaseSearch" label="Case search" />
      </section>
    }
    @if (sections().length) {
      <ul class="home__grid">
        @for (s of sections(); track s.path) {
          <li>
            <a class="home__card" [routerLink]="s.path"
              ><strong>{{ s.label }}</strong
              ><ds-badge>{{ s.group }}</ds-badge></a
            >
          </li>
        }
      </ul>
    } @else {
      <p class="home__empty">No sections are available to you in this environment yet.</p>
    }
    <p class="home__meta">{{ entitlements.count() }} entitlements loaded.</p>
  `,
  styles: `
    .home__grid {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: var(--ds-space-3);
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .home__card {
      display: flex;
      flex-direction: column;
      gap: var(--ds-space-2);
      padding: var(--ds-space-4);
      background: var(--ds-color-surface);
      border: 1px solid var(--ds-color-border);
      border-radius: var(--ds-radius-md);
      color: inherit;
      text-decoration: none;
    }
    .home__card:hover {
      border-color: var(--ds-color-primary);
    }
    .home__empty,
    .home__meta {
      color: var(--ds-color-text-muted);
    }
  `,
})
export class HomeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly entitlements = inject(EntitlementsService);
  protected readonly caseSearchDeployed = isRemoteDeployed('mfe-cap-case-search');
  protected readonly sections = computed(() =>
    visibleNavItems(SHELL_REMOTE_ROUTES, isRemoteDeployed, (e) => this.entitlements.has(e)).filter(
      (i) => i.path !== '/',
    ),
  );
}

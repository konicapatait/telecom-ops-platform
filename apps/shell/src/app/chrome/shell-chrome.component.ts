/**
 * @file App chrome ONLY: header, nav, notifications.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DsAppShell, DsBadge, DsButton, DsNavList, DsNotificationHost, DsSelect } from '@org/design-system';
import { AuthService, PERSONA_SWITCHER } from '@platform/auth';
import { CaseContextStore, type Persona } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { isRemoteDeployed } from '@platform/mf-manifest';
import { CapabilitySlotComponent } from './capability-slot.component';
import { environment } from '../../environments/environment';
import { SHELL_REMOTE_ROUTES } from '../routing/remote-registry';
import { visibleNavItems } from '../routing/nav';

/** App chrome ONLY: header, nav, notifications. Everything below the chrome belongs to a family layout (ADR-0002). */
@Component({
  selector: 'shell-chrome',
  imports: [
    RouterOutlet,
    DsAppShell,
    DsNavList,
    DsNotificationHost,
    DsSelect,
    DsBadge,
    DsButton,
    CapabilitySlotComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell-chrome.component.html',
  styleUrl: './shell-chrome.component.css',
})
export class ShellChromeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly personas = inject(PERSONA_SWITCHER, { optional: true });
  private readonly entitlements = inject(EntitlementsService);
  protected readonly caseContext = inject(CaseContextStore);

  protected readonly mockMode = environment.mocks;
  /** Global subscriber search (Phase 4) is a capability remote; shown when deployed. */
  protected readonly subscriberSearch = isRemoteDeployed('mfe-cap-subscriber-search');
  protected readonly navItems = computed(() =>
    visibleNavItems(SHELL_REMOTE_ROUTES, isRemoteDeployed, (e) => this.entitlements.has(e)),
  );
  protected readonly personaOptions = (this.personas?.personas ?? []).map((p) => ({ value: p.id, label: p.label }));

  protected switchPersona(id: string): void {
    // A persona switch is a sign-in as someone else: reload so every guard, resolver and cached view re-evaluates.
    this.personas?.switchTo(id as Persona['id']);
    location.reload();
  }

  protected signOut(): void {
    void this.auth.logout();
  }
}

/**
 * @file Level-2 family layout for every case domain (ADR-0002).
 */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CASE_DOMAIN_CONFIG } from '../domain/case-domain';

/** Level-2 family layout for every case domain (ADR-0002). Deliberately thin: domain differences live in config. */
@Component({
  selector: 'cw-case-workspace-layout',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-domain]': 'config.domain' },
  template: `<router-outlet />`,
  styles: `
    :host {
      display: block;
    }
  `,
})
export class CaseWorkspaceLayoutComponent {
  protected readonly config = inject(CASE_DOMAIN_CONFIG);
}

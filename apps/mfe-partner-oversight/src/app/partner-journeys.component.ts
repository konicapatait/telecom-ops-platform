/**
 * @file Journey switcher above the shared case layout.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PARTNER_JOURNEYS } from './partner-oversight.config';

/** Journey switcher above the shared case layout. Navigation only, no layout of its own (ADR-0021). */
@Component({
  selector: 'partneroversight-journeys',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="journeys" aria-label="Partner journeys">
      @for (j of journeys; track j.path) {
        <a
          [routerLink]="j.path"
          routerLinkActive="journeys__link--active"
          ariaCurrentWhenActive="page"
          class="journeys__link"
          >{{ j.label }}</a
        >
      }
    </nav>
    <router-outlet />
  `,
  styles: `
    .journeys {
      display: flex;
      gap: var(--ds-space-2);
      margin-bottom: var(--ds-space-4);
    }
    .journeys__link {
      padding: var(--ds-space-1) var(--ds-space-3);
      border-radius: 999px;
      border: 1px solid var(--ds-color-border);
      color: var(--ds-color-text);
      text-decoration: none;
      font-size: var(--ds-font-size-sm);
    }
    .journeys__link--active {
      background: var(--ds-color-primary);
      border-color: var(--ds-color-primary);
      color: var(--ds-color-primary-contrast);
    }
  `,
})
export class PartnerJourneysComponent {
  protected readonly journeys = PARTNER_JOURNEYS;
}

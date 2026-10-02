/**
 * @file Presentational list of cases for 360 panels.
 */
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { DsBadge, type DsBadgeTone } from '@org/design-system';
import type { CasePriority, CaseSummary } from '@platform/contracts';

const TONE: Record<CasePriority, DsBadgeTone> = { LOW: 'neutral', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger' };

/** Presentational list of cases for 360 panels. The app fetches; choosing a case emits `openCase`. */
@Component({
  selector: 'l360-case-list',
  imports: [DatePipe, DsBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="cl" [attr.aria-label]="label()">
      @for (c of cases(); track c.caseId) {
        <li>
          <button type="button" class="cl__item" (click)="openCase.emit(c)">
            <span class="cl__id">{{ c.caseId }}</span>
            <ds-badge [tone]="tone(c)">{{ c.priority }}</ds-badge>
            <span class="cl__meta"
              >{{ c.domain.replaceAll('_', ' ') }} · {{ c.status.replace('_', ' ') }} ·
              {{ c.openedAt | date: 'MMM d' : 'UTC' }}</span
            >
          </button>
        </li>
      } @empty {
        <li class="cl__meta">{{ emptyText() }}</li>
      }
    </ul>
  `,
  styles: `
    .cl {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: var(--ds-space-2);
    }
    .cl__item {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--ds-space-2);
      padding: var(--ds-space-2);
      background: var(--ds-color-surface-sunken);
      border: 1px solid transparent;
      border-radius: var(--ds-radius-sm);
      cursor: pointer;
      text-align: left;
    }
    .cl__item:hover {
      border-color: var(--ds-color-primary);
    }
    .cl__id {
      font-family: var(--ds-font-family-mono);
      color: var(--ds-color-primary);
    }
    .cl__meta {
      color: var(--ds-color-text-muted);
      font-size: var(--ds-font-size-sm);
      width: 100%;
    }
  `,
})
export class CaseListComponent {
  readonly cases = input.required<CaseSummary[]>();
  readonly label = input('Cases');
  readonly emptyText = input('No open cases.');
  readonly openCase = output<CaseSummary>();
  protected tone(c: CaseSummary): DsBadgeTone {
    return TONE[c.priority];
  }
}

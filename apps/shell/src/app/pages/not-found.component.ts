/**
 * @file Not-found page rendered inside the chrome.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DsEmptyState } from '@org/design-system';

@Component({
  selector: 'shell-not-found',
  imports: [DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ds-empty-state
    icon="empty"
    heading="Page not found"
    message="Check the address, or use the navigation on the left."
  />`,
})
export class NotFoundComponent {}

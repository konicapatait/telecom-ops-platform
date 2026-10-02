/**
 * @file "No access" page; shows the missing entitlement passed by entitlementGuard.
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DsEmptyState } from '@org/design-system';

@Component({
  selector: 'shell-forbidden',
  imports: [DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ds-empty-state
    icon="lock"
    heading="You don't have access to this page"
    [message]="need() ? 'Required entitlement: ' + need() : 'Ask your supervisor if you need access.'"
  />`,
})
export class ForbiddenComponent {
  /** ?need=<entitlement> from entitlementGuard */
  readonly need = input<string>();
}

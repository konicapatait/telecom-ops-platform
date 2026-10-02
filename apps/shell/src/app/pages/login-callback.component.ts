/**
 * @file Okta redirect target; AuthService.init() completes sign-in while this shows a skeleton.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DsSkeleton } from '@org/design-system';

/** Okta redirects here. AuthService.init() (app initializer) completes the code exchange and restores the original URL. */
@Component({
  selector: 'shell-login-callback',
  imports: [DsSkeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ds-skeleton variant="panel" />`,
})
export class LoginCallbackComponent {}

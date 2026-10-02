/**
 * @file provideAuth(oktaConfig): registers real (Okta) auth; mock builds override it in start-mocks.ts (ADR-0013).
 */
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { OktaAuthService } from './okta/okta-auth.service';

export interface OktaConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scopes?: string[];
}

export const OKTA_CONFIG = new InjectionToken<OktaConfig>('OKTA_CONFIG');

/**
 * Real auth. Mock configurations add `provideMockAuth(...)` AFTER this, which overrides `AuthService`.
 * That override lives in each app's `start-mocks.ts`, which `fileReplacements` swaps out in production.
 */
export function provideAuth(config: OktaConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: OKTA_CONFIG, useValue: config },
    { provide: AuthService, useClass: OktaAuthService },
  ]);
}

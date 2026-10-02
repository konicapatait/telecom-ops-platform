/**
 * @file CASE_DOMAIN_CONFIG token and provideCaseDomain(): how a domain hands its CaseDomainConfig to the shared layout.
 */
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import type { CaseDomainConfig } from '@platform/contracts';

export const CASE_DOMAIN_CONFIG = new InjectionToken<CaseDomainConfig>('CASE_DOMAIN_CONFIG');

/** Route-level provider: `providers: [provideCaseDomain(FRAUD_DOMAIN_CONFIG)]`. */
export function provideCaseDomain(config: CaseDomainConfig): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: CASE_DOMAIN_CONFIG, useValue: config }]);
}

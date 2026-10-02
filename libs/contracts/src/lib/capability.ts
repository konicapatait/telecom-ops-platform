/**
 * @file Input contracts for capability components: case tabs (caseId/caseType), decision (+codes), 360 panels (accountId).
 */
import type { CaseType } from './case';
import type { CaseResolutionCode } from './case-tabs';

/** The inputs every case capability component accepts. Nothing else is passed in. */
export interface CaseCapabilityInputs {
  caseId: string;
  caseType: CaseType;
}

/**
 * The resolution capability (action rail) additionally receives the DOMAIN's codes from its CaseDomainConfig,
 * passed by the case view through the tab host's `inputs` (ADR-0020). v1.1, additive.
 */
export interface CaseResolutionInputs extends CaseCapabilityInputs {
  resolutionCodes: CaseResolutionCode[];
}

/**
 * v1.3 (additive): inputs for capabilities embedded as 360 panels (ADR-0024). A capability that serves both
 * case screens and 360 screens accepts EITHER CaseCapabilityInputs OR this, and loads data accordingly.
 */
export interface SubscriberCapabilityInputs {
  accountId: string;
}

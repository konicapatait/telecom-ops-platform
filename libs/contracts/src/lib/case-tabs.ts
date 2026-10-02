/**
 * @file Case-screen configuration types: CaseTabDefinition and CaseDomainConfig (tabs are configuration, ADR-0005).
 */
import type { CaseDomain } from './case';
import type { RemoteName } from './remotes';

export interface CaseTabDefinition {
  /** Stable id, e.g. 'usage'. */
  id: string;
  /** Visible label, e.g. 'Usage & billing'. */
  label: string;
  /** Key in the environment manifest, e.g. 'mfe-cap-usage-billing'. */
  remote: RemoteName;
  /** Exposed module, e.g. './UsageBilling'. */
  exposedModule: string;
  /** Hidden unless the user holds this entitlement, e.g. 'case:usage:view'. */
  entitlement?: string;
  order: number;
}

export interface CaseResolutionCode {
  code: string;
  label: string;
  requiresNote: boolean;
}

export interface CaseDomainConfig {
  domain: CaseDomain;
  /** e.g. 'Fraud case' */
  title: string;
  /** Queue page heading, e.g. 'Fraud alerts'. Defaults to `title` + 's'. (v1.1, additive) */
  queueTitle?: string;
  tabs: CaseTabDefinition[];
  /** Mounted in the action rail, not as a tab. */
  resolution: CaseTabDefinition;
  resolutionCodes: CaseResolutionCode[];
}

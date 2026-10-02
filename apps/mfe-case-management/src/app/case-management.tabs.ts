/**
 * @file One tab of the Case management page = one case-domain remote (ADR-0022).
 */
import type { CaseDomain, RemoteName } from '@platform/contracts';

/**
 * One tab of the Case management page = one case-domain remote (ADR-0022). Tabs are configuration:
 * adding a domain is one entry here (the generator does it for `--kind=domain --family=case`).
 */
export interface CaseManagementTab {
  id: string;
  label: string;
  /** URL segment under /case-management[/customers/:id]. */
  path: string;
  /** The domain remote whose ./Routes render inside the tab. */
  remote: RemoteName;
  /** Case domains served by this tab, and the sub-path (inside the remote's routes) that holds their queue. */
  domains: { domain: CaseDomain; subPath: string }[];
  entitlement?: string;
}

export const CASE_MANAGEMENT_TABS: CaseManagementTab[] = [
  {
    id: 'fraud',
    label: 'Fraud',
    path: 'fraud',
    remote: 'mfe-fraud',
    domains: [{ domain: 'FRAUD', subPath: '' }],
    entitlement: 'fraud:view',
  },
  {
    id: 'disputes',
    label: 'Billing disputes',
    path: 'disputes',
    remote: 'mfe-billing-disputes',
    domains: [{ domain: 'BILLING_DISPUTE', subPath: '' }],
    entitlement: 'disputes:view',
  },
  {
    id: 'assurance',
    label: 'Service assurance',
    path: 'assurance',
    remote: 'mfe-service-assurance',
    domains: [{ domain: 'SERVICE_ASSURANCE', subPath: '' }],
    entitlement: 'assurance:view',
  },
  {
    id: 'porting',
    label: 'Number porting',
    path: 'porting',
    remote: 'mfe-number-porting',
    domains: [{ domain: 'NUMBER_PORTING', subPath: '' }],
    entitlement: 'porting:view',
  },
  {
    id: 'partners',
    label: 'Partner oversight',
    path: 'partners',
    remote: 'mfe-partner-oversight',
    domains: [
      { domain: 'PARTNER_ONBOARDING', subPath: 'onboarding' },
      { domain: 'PARTNER_ONGOING', subPath: 'ongoing' },
      { domain: 'PARTNER_FIELD_AUDIT', subPath: 'field-audit' },
    ],
    entitlement: 'partners:view',
  },
  // <generator:case-tabs>
];

/** Where a case of `domain` lives inside the hub, e.g. 'partners/field-audit'. */
export function tabPathFor(domain: CaseDomain): string | null {
  for (const t of CASE_MANAGEMENT_TABS) {
    const d = t.domains.find((x) => x.domain === domain);
    if (d) return d.subPath ? `${t.path}/${d.subPath}` : t.path;
  }
  return null;
}

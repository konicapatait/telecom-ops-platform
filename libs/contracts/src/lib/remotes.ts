/**
 * Every federation remote, by the key it has in `config/mf-manifest.<env>.json`.
 * Maintained by the workspace generator (`nx g @platform/tools:mfe`). Do not hand-edit the list.
 */
export const REMOTE_NAMES = [
  'mfe-fraud',
  'mfe-cap-audit-trail',
  'mfe-cap-usage-billing',
  'mfe-cap-attachments',
  'mfe-cap-case-resolution',
  'mfe-billing-disputes',
  'mfe-service-assurance',
  'mfe-number-porting',
  'mfe-partner-oversight',
  'mfe-cap-account-view',
  'mfe-cap-case-search',
  'mfe-case-management',
  'mfe-cap-subscriber-search',
  'mfe-subscriber-view',
  'mfe-partner-view',
  'mfe-reporting',
  // <generator:remote-names>
] as const;

export type RemoteName = (typeof REMOTE_NAMES)[number];

export function isRemoteName(value: string): value is RemoteName {
  return (REMOTE_NAMES as readonly string[]).includes(value);
}

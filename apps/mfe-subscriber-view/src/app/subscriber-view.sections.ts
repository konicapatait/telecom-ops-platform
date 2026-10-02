/**
 * @file Customer full profile sections, as data (ADR-0024).
 */
import type { Section360 } from '@platform/layout-360';

/**
 * Customer full profile sections, as data (ADR-0024). Capability sections get `accountId` (SubscriberCapabilityInputs);
 * the others are rendered by this app. No audit log on 360 screens (resolved decision).
 */
export const SUBSCRIBER_VIEW_SECTIONS: Section360[] = [
  {
    id: 'account',
    title: 'Account & lines',
    span: 2,
    remote: 'mfe-cap-account-view',
    exposedModule: './AccountView',
    inputs: ['accountId'],
  },
  { id: 'open-cases', title: 'Open cases', span: 1 },
  {
    id: 'usage',
    title: 'Usage & billing',
    span: 2,
    remote: 'mfe-cap-usage-billing',
    exposedModule: './UsageBilling',
    inputs: ['accountId'],
    entitlement: 'case:usage:view',
  },
  { id: 'linked-partners', title: 'Linked agents', span: 1 },
];

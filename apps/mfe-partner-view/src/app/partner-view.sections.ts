/**
 * @file Agent full profile sections, as data (ADR-0024).
 */
import type { Section360 } from '@platform/layout-360';

/** Agent full profile sections, as data (ADR-0024). All rendered by this app. No audit log on 360 screens. */
export const PARTNER_VIEW_SECTIONS: Section360[] = [
  { id: 'findings', title: 'Findings', span: 2 },
  { id: 'open-cases', title: 'Open cases', span: 1 },
  { id: 'linked-subscribers', title: 'Linked customers', span: 3 },
];

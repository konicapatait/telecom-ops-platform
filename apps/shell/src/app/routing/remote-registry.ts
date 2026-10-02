/**
 * @file Shell section registry (maintained by the generator) and legacy redirect list.
 */
import type { RemoteName } from '@platform/contracts';

/** A top-level section of the app, served by a remote that exposes `./Routes`. */
export interface ShellRemoteRoute {
  remote: RemoteName;
  /** URL segment under the shell, e.g. 'case-management'. */
  path: string;
  /** Left-nav label. */
  label: string;
  /** Left-nav group. */
  group: 'Case management' | 'Full profiles' | 'Insights';
  /** Hide the nav entry unless the user holds this. The remote's own routes still guard themselves. */
  entitlement?: string;
  /**
   * The section resolves `/<path>/cases/:caseId` for ANY case domain (the case-management hub, ADR-0022).
   * The shell sends CaseEvent.OPEN_CASE there and the section picks the right tab.
   */
  opensCases?: boolean;
  /** The section shows a 360 profile at `/<path>/:id` (Phase 4, ADR-0024). The shell routes OPEN_*_360 events there. */
  opensProfile?: 'SUBSCRIBER' | 'PARTNER';
}

/**
 * Maintained by the workspace generator (`nx g @platform/tools:mfe --kind=domain|hub ...`).
 * Case domains are NOT listed here: they are tabs of mfe-case-management (ADR-0022).
 */
export const SHELL_REMOTE_ROUTES: ShellRemoteRoute[] = [
  {
    remote: 'mfe-case-management',
    path: 'case-management',
    label: 'Case management',
    group: 'Case management',
    entitlement: 'case-management:view',
    opensCases: true,
  },
  {
    remote: 'mfe-subscriber-view',
    path: 'customer-full-profile',
    label: 'Customer full profile',
    group: 'Full profiles',
    entitlement: 'subscribers:view',
    opensProfile: 'SUBSCRIBER',
  },
  {
    remote: 'mfe-partner-view',
    path: 'agent-full-profile',
    label: 'Agent full profile',
    group: 'Full profiles',
    entitlement: 'partner360:view',
    opensProfile: 'PARTNER',
  },
  { remote: 'mfe-reporting', path: 'reports', label: 'Reports', group: 'Insights', entitlement: 'reports:view' },
  // <generator:shell-routes>
];

/**
 * Old section URLs → their current home (ADR-0022: Case management tabs; ADR-0026: full profiles). Remaining segments and query params are kept,
 * so bookmarks like /fraud/cases/FRD-2026-000142?tab=audit still land on the same case.
 * Remove after one release cycle once access logs show no hits.
 */
export const LEGACY_REDIRECTS: { from: string; to: string }[] = [
  { from: 'fraud', to: '/case-management/fraud' },
  { from: 'disputes', to: '/case-management/disputes' },
  { from: 'assurance', to: '/case-management/assurance' },
  { from: 'porting', to: '/case-management/porting' },
  { from: 'partners', to: '/case-management/partners' },
  // ADR-0026: 360 views renamed to "full profiles"
  { from: 'subscribers', to: '/customer-full-profile' },
  { from: 'partner-360', to: '/agent-full-profile' },
];

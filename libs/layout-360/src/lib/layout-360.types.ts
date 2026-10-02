/**
 * @file Configuration types of the 360 layout: profile banner, KPI tiles and grid sections (ADR-0024).
 */
import type { RemoteName } from '@platform/contracts';
import type { DsBadgeTone } from '@org/design-system';

/** Profile banner at the top of a 360 view. */
export interface Profile360 {
  title: string;
  subtitle?: string;
  badges?: { label: string; tone?: DsBadgeTone }[];
  facts?: { label: string; value: string }[];
}

/** One tile in the KPI strip. */
export interface Kpi360 {
  label: string;
  value: string;
  tone?: 'neutral' | 'good' | 'warning' | 'danger';
  hint?: string;
}

/**
 * One section of the grid: either a capability remote (`remote` + `exposedModule`) fed with `inputs`
 * picked from the layout's `panelInputs`, or a panel the app renders itself (`<ng-template l360Section="id">`).
 */
export interface Section360 {
  id: string;
  title: string;
  /** Grid columns (of 3). */
  span: 1 | 2 | 3;
  remote?: RemoteName;
  exposedModule?: string;
  /** Names of `panelInputs` entries passed to the capability, e.g. ['accountId']. */
  inputs?: string[];
  /** Hidden unless the user holds this. */
  entitlement?: string;
}

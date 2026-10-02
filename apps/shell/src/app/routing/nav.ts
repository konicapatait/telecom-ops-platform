/**
 * @file Nav shows a section only when its remote is in this environment's manifest AND the user is entitled.
 */
import type { DsNavItem } from '@org/design-system';
import type { RemoteName } from '@platform/contracts';
import type { ShellRemoteRoute } from './remote-registry';

/** Nav shows a section only when its remote is in this environment's manifest AND the user is entitled. */
export function visibleNavItems(
  registry: readonly ShellRemoteRoute[],
  isDeployed: (remote: RemoteName) => boolean,
  has: (entitlement: string | undefined) => boolean,
): DsNavItem[] {
  return [
    { label: 'Home', path: '/' },
    ...registry
      .filter((r) => isDeployed(r.remote) && has(r.entitlement))
      .map((r) => ({ label: r.label, path: `/${r.path}`, group: r.group })),
  ];
}

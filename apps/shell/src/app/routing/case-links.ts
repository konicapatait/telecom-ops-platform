/**
 * @file URLs for opening a case or a 360 profile from the registry (used by the OPEN_* event handlers).
 */
import type { ShellRemoteRoute } from './remote-registry';

/** URL that opens a case: the first deployed section that resolves any case id (the case-management hub). */
export function caseUrl(
  registry: readonly ShellRemoteRoute[],
  caseId: string,
  isDeployed: (r: ShellRemoteRoute) => boolean = () => true,
): string | null {
  const section = registry.find((r) => r.opensCases && isDeployed(r));
  return section ? `/${section.path}/cases/${encodeURIComponent(caseId)}` : null;
}

/** URL of a subscriber's or partner's 360 view, or null when no deployed section shows that kind of profile. */
export function profileUrl(
  registry: readonly ShellRemoteRoute[],
  kind: 'SUBSCRIBER' | 'PARTNER',
  id: string,
  isDeployed: (r: ShellRemoteRoute) => boolean = () => true,
): string | null {
  const section = registry.find((r) => r.opensProfile === kind && isDeployed(r));
  return section ? `/${section.path}/${encodeURIComponent(id)}` : null;
}

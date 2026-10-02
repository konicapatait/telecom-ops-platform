/**
 * @file The runtime remote manifest ({ remote → remoteEntry.json URL }) for this environment, set once at boot (ADR-0007).
 */
import { isRemoteName, type RemoteName } from '@platform/contracts';

/** `{ "<remote-name>": "<absolute or root-relative URL of its remoteEntry.json>" }`, one file per environment. */
export type RemoteManifest = Partial<Record<RemoteName, string>>;

let manifest: RemoteManifest = {};

/** Called once by the shell (or a remote's standalone harness) with the manifest it booted with. */
export function setRemoteManifest(value: Record<string, string>): void {
  const clean: RemoteManifest = {};
  for (const [name, url] of Object.entries(value ?? {})) {
    if (isRemoteName(name) && typeof url === 'string' && url.length > 0) clean[name] = url;
  }
  manifest = clean;
}

export function getRemoteManifest(): Readonly<RemoteManifest> {
  return manifest;
}

export function isRemoteDeployed(remote: RemoteName): boolean {
  return !!manifest[remote];
}

/** Fetches a manifest; resolves to `{}` (no remotes) rather than failing the whole shell. */
export async function fetchRemoteManifest(url: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * @file Shell entry point: federation boot (ADR-0007).
 *
 * Boot order matters:
 *   1. fetch this environment's manifest (deployed next to index.html; a manifest change = deploy/rollback)
 *   2. initFederation: shared deps + reachable remotes into the import map (unreachable ones are logged, not fatal)
 *   3. only THEN import anything that touches shared packages (@angular/*, @platform/*), i.e. ./bootstrap
 * Nothing here may import a shared package, so boot timings are measured with `performance` and handed to
 * bootstrap(), which logs them through the platform logger (ADR-0025).
 */
import { initFederation } from '@angular-architects/native-federation';

const manifestUrl = 'mf-manifest.json';
const t0 = performance.now();
let manifestStatus = 'ok';

fetch(manifestUrl, { cache: 'no-cache' })
  .then((res) => {
    if (res.ok) return res.json();
    manifestStatus = `HTTP ${res.status}`;
    return {};
  })
  .catch((err) => {
    manifestStatus = `unreachable: ${String(err)}`;
    return {};
  })
  .then(async (manifest: Record<string, string>) => {
    const t1 = performance.now();
    await initFederation(manifest);
    const t2 = performance.now();
    const { bootstrap } = await import('./bootstrap');
    await bootstrap(manifest, {
      manifestUrl,
      manifestStatus,
      manifestMs: Math.round(t1 - t0),
      initFederationMs: Math.round(t2 - t1),
    });
  })
  .catch((err) => console.error('[platform] FATAL shell failed to start', err));

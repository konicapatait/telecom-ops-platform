/**
 * @file Standalone entry of mfe-case-management (dev harness). When composed in the shell, only the exposed modules run.
 */
import { initFederation } from '@angular-architects/native-federation';

/*
 * Standalone entry (dev harness). The hub hosts OTHER remotes, so standalone it needs the local manifest too
 * (served only in the development configuration). When composed in the shell, the shell's manifest is used.
 */
fetch('mf-manifest.json', { cache: 'no-cache' })
  .then((res) => (res.ok ? res.json() : {}))
  .catch(() => ({}))
  .then(async (manifest: Record<string, string>) => {
    await initFederation(manifest);
    const { bootstrap } = await import('./bootstrap');
    await bootstrap(manifest);
  })
  .catch((err) =>
    console.error('[platform] FATAL mfe-case-management failed to start (before the logger exists)', err),
  );

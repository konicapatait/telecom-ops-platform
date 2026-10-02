/**
 * @file Standalone entry of mfe-cap-case-resolution (dev harness). When composed in the shell, only the exposed modules run.
 */
import { initFederation } from '@angular-architects/native-federation';

// Standalone entry (dev harness). When composed in the shell, only the exposed module runs, never this file.
initFederation()
  .then(() => import('./bootstrap'))
  .catch((err) =>
    console.error('[platform] FATAL mfe-cap-case-resolution failed to start (before the logger exists)', err),
  );

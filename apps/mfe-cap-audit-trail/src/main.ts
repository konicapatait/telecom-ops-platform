/**
 * @file Standalone entry of mfe-cap-audit-trail (dev harness). When composed in the shell, only the exposed modules run.
 */
import { initFederation } from '@angular-architects/native-federation';

// Standalone entry (dev harness). When composed in the shell, only the exposed module runs, never this file.
initFederation()
  .then(() => import('./bootstrap'))
  .catch((err) =>
    console.error('[platform] FATAL mfe-cap-audit-trail failed to start (before the logger exists)', err),
  );

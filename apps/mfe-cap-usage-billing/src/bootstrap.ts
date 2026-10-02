/**
 * @file Bootstraps mfe-cap-usage-billing's standalone dev harness after initFederation (mocks first, then Angular).
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { installPlatformDiagnostics } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { harnessConfig } from './app/app.config';
import { DevHarnessComponent } from './app/dev-harness.component';
import { startMocks } from './start-mocks';

const log = createLogger('mfe-cap-usage-billing');

startMocks()
  .then((mockProviders) => bootstrapApplication(DevHarnessComponent, harnessConfig(mockProviders)))
  .then(() => {
    installPlatformDiagnostics({ app: 'mfe-cap-usage-billing', standalone: true });
    log.info('Dev harness started');
  })
  .catch((err) => log.error('Dev harness failed to start', { reason: String(err) }));

/**
 * @file Bootstraps mfe-case-management's standalone dev harness after initFederation (mocks first, then Angular).
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { installPlatformDiagnostics, setRemoteManifest } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { harnessConfig } from './app/app.config';
import { DevHarnessComponent } from './app/dev-harness.component';
import { startMocks } from './start-mocks';

export async function bootstrap(manifest: Record<string, string>): Promise<void> {
  setRemoteManifest(manifest);
  const mockProviders = await startMocks();
  await bootstrapApplication(DevHarnessComponent, harnessConfig(mockProviders));
  installPlatformDiagnostics({ app: 'mfe-case-management', standalone: true });
  createLogger('mfe-case-management').info('Dev harness started', { remotes: Object.keys(manifest).length });
}

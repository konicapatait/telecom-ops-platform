/**
 * @file Shell bootstrap: runs after initFederation, so shared packages are available (ADR-0007).
 * Logs a one-line boot summary with timings and installs the `platformDiagnostics()` console helper (ADR-0025).
 */
import { bootstrapApplication } from '@angular/platform-browser';
import { installPlatformDiagnostics, setRemoteManifest } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { loadRuntimeConfig } from './app/core/runtime-config';
import { environment } from './environments/environment';
import { startMocks } from './start-mocks';

export interface BootTimings {
  manifestUrl: string;
  /** 'ok', 'HTTP 404', 'unreachable: …' — anything but 'ok' means NO remotes this session. */
  manifestStatus: string;
  manifestMs: number;
  initFederationMs: number;
}

const log = createLogger('shell');

export async function bootstrap(manifest: Record<string, string>, boot: BootTimings): Promise<void> {
  const start = performance.now();
  setRemoteManifest(manifest);
  const remotes = Object.keys(manifest);
  if (boot.manifestStatus !== 'ok') {
    log.error('Remote manifest unavailable: every remote section will show "unavailable"', { ...boot });
  }
  log.debug('Remote manifest', { manifest });

  const runtimeConfig = await loadRuntimeConfig();
  // Must run before bootstrapApplication so the very first API call is already mocked.
  const mockProviders = await startMocks();
  installPlatformDiagnostics({
    app: 'shell',
    build: environment.build,
    environment: runtimeConfig.environment,
    mocks: environment.mocks,
  });

  await bootstrapApplication(App, appConfig(runtimeConfig, mockProviders));
  log.info('Shell started', {
    environment: runtimeConfig.environment,
    build: environment.build,
    remotes: remotes.length,
    manifestMs: boot.manifestMs,
    initFederationMs: boot.initFederationMs,
    bootstrapMs: Math.round(performance.now() - start),
  });
}

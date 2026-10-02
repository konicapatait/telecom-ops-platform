/**
 * @file Mock wiring for shell (MSW + personas). The ONLY place it may import @platform/mocks; replaced in production (ADR-0006).
 */
import type { EnvironmentProviders } from '@angular/core';
import { provideMockAuth } from '@platform/auth-mock';
import { setRemoteFailureSimulator } from '@platform/mf-manifest';
import { PERSONAS, allHandlers, shouldFailRemote, startMockWorker } from '@platform/mocks';
import { environment } from './environments/environment';

/**
 * The ONLY place the shell touches @platform/mocks. Production builds replace this file with
 * start-mocks.prod.ts (fileReplacements), so no mock code or fixture can reach a production bundle (ADR-0006).
 */
export async function startMocks(): Promise<EnvironmentProviders[]> {
  const providers: EnvironmentProviders[] = [];
  if (environment.mocks) {
    await startMockWorker(allHandlers);
    setRemoteFailureSimulator(shouldFailRemote);
  }
  if (environment.mockAuth) providers.push(provideMockAuth(PERSONAS));
  return providers;
}

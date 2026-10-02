/**
 * @file Mock wiring for mfe-number-porting (MSW + personas). The ONLY place it may import @platform/mocks; replaced in production (ADR-0006).
 */
import type { EnvironmentProviders } from '@angular/core';
import { provideMockAuth } from '@platform/auth-mock';
import { PERSONAS, allHandlers, startMockWorker } from '@platform/mocks';
import { environment } from './environments/environment';

/** Standalone harness only. Production builds replace this file with start-mocks.prod.ts (ADR-0006). */
export async function startMocks(): Promise<EnvironmentProviders[]> {
  if (environment.mocks) await startMockWorker(allHandlers);
  return environment.mockAuth ? [provideMockAuth(PERSONAS)] : [];
}

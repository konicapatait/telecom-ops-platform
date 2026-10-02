/**
 * @file Production stub of start-mocks.ts for mfe-reporting: no worker, no fixtures (ADR-0006).
 */
import type { EnvironmentProviders } from '@angular/core';

export async function startMocks(): Promise<EnvironmentProviders[]> {
  return [];
}

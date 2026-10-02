/**
 * @file Per-environment values, read at runtime from /app-config.json so ONE build artifact is promoted dev -> staging -> prod (ADR-0012).
 */
import { InjectionToken } from '@angular/core';

/**
 * Per-environment values, read at runtime from /app-config.json so ONE build artifact is promoted
 * dev -> staging -> prod (ADR-0012). The pipeline uploads apps/shell/config/<env>/app-config.json.
 */
export interface RuntimeConfig {
  environment: 'local' | 'dev' | 'staging' | 'prod';
  okta: { issuer: string; clientId: string; redirectPath: string };
  logEndpoint: string | null;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

const FALLBACK: RuntimeConfig = {
  environment: 'local',
  okta: { issuer: '', clientId: '', redirectPath: '/login/callback' },
  logEndpoint: null,
};

export async function loadRuntimeConfig(url = 'app-config.json'): Promise<RuntimeConfig> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    return res.ok ? { ...FALLBACK, ...((await res.json()) as Partial<RuntimeConfig>) } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

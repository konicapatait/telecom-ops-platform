/**
 * @file `platformDiagnostics()`: a console helper for support and developers (ADR-0025).
 *
 *   > platformDiagnostics()                 // summary: session, log level, manifest, failures, slowest loads
 *   > platformDiagnostics().loads           // every remote load (trace id, timing, outcome, code)
 *   > platformDiagnostics().setLogLevel('debug')
 *
 * Read-only and free of secrets (no tokens, no personal data), so it is installed in every build.
 */
import { getLogLevel, sessionId, setLogLevel, type LogLevel } from '@platform/utils';
import { REMOTE_ERROR_HINTS, getRemoteLoadRecords } from './diagnostics';
import { getRemoteManifest } from './manifest';

export interface PlatformDiagnostics {
  sessionId: string;
  logLevel: LogLevel;
  app: Record<string, unknown>;
  manifest: Readonly<Record<string, string>>;
  loads: ReturnType<typeof getRemoteLoadRecords>;
  failures: {
    traceId: string;
    remote: string;
    exposedModule: string;
    code?: string;
    hint?: string;
    reason?: string;
    at: string;
  }[];
  slowest: { remote: string; exposedModule: string; durationMs: number }[];
  setLogLevel: (level: LogLevel) => void;
}

export function platformDiagnostics(app: Record<string, unknown> = {}): PlatformDiagnostics {
  const loads = getRemoteLoadRecords();
  return {
    sessionId,
    logLevel: getLogLevel(),
    app,
    manifest: getRemoteManifest() as Record<string, string>,
    loads,
    failures: loads
      .filter((l) => l.outcome === 'failed')
      .map((l) => ({
        traceId: l.traceId,
        remote: l.remote,
        exposedModule: l.exposedModule,
        code: l.code,
        hint: l.code ? REMOTE_ERROR_HINTS[l.code] : undefined,
        reason: l.reason,
        at: l.startedAt,
      })),
    slowest: [...loads]
      .filter((l) => l.outcome === 'loaded')
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 5)
      .map(({ remote, exposedModule, durationMs }) => ({ remote, exposedModule, durationMs })),
    setLogLevel,
  };
}

/** Called once by the shell (and by a remote's standalone harness). `app` = build/env facts to include. */
export function installPlatformDiagnostics(app: Record<string, unknown>): void {
  (globalThis as unknown as { platformDiagnostics: () => PlatformDiagnostics }).platformDiagnostics = () =>
    platformDiagnostics(app);
}

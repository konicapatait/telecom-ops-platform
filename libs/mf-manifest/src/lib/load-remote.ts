/**
 * @file The ONLY way the platform loads remote code (ADR-0007, ADR-0025).
 *
 * Every load is traced: a trace id, timing (also a `performance.measure` visible in DevTools → Performance),
 * a classified error code + fix hint on failure, and a record in the diagnostics history.
 * Logging policy (source `federation`):
 *   - first successful load of a remote module → INFO  "Remote loaded"            (once per remote+module)
 *   - repeat loads (cached by the browser)       → DEBUG "Remote module (cached)"
 *   - failure                                    → WARN  "Remote failed to load"    (every attempt, incl. Retry)
 *   - preload                                    → DEBUG only (the real load reports failures)
 */
import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import type { RemoteName } from '@platform/contracts';
import { createLogger } from '@platform/utils';
import {
  REMOTE_ERROR_HINTS,
  classifyRemoteError,
  nextTraceId,
  recordRemoteLoad,
  type RemoteErrorCode,
} from './diagnostics';
import { getRemoteManifest } from './manifest';

const log = createLogger('federation');

export class RemoteLoadError extends Error {
  readonly code: RemoteErrorCode;
  readonly hint: string;

  constructor(
    readonly remote: RemoteName,
    readonly exposedModule: string,
    readonly reason: unknown,
    readonly traceId = '',
    readonly remoteEntry?: string,
  ) {
    super(`Remote "${remote}" (${exposedModule}) failed to load`);
    this.name = 'RemoteLoadError';
    this.code = classifyRemoteError(reason);
    this.hint = REMOTE_ERROR_HINTS[this.code];
  }
}

type FailureSimulator = (remote: RemoteName) => boolean;
let simulateFailure: FailureSimulator = () => false;

/** Dev-only hook (mock configurations wire it to `?mockFail=<remote>`). */
export function setRemoteFailureSimulator(fn: FailureSimulator): void {
  simulateFailure = fn;
}

type FailureListener = (error: RemoteLoadError) => void;
const listeners = new Set<FailureListener>();

/** Subscribe to remote-load failures (already logged here; use for UI/telemetry reactions). */
export function onRemoteFailure(listener: FailureListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function logRemoteFailure(error: RemoteLoadError): void {
  listeners.forEach((l) => l(error));
}

const loadedOnce = new Set<string>();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function measure(name: string, start: number): number {
  const end = now();
  try {
    performance.measure(name, { start, end });
  } catch {
    /* older browsers / tests */
  }
  return Math.round(end - start);
}

/**
 * Loads an exposed module by remote name. Always passes the manifest URL so a remote that was
 * DOWN when the shell started is registered on retry instead of failing forever.
 */
export async function loadRemote<T = unknown>(remote: RemoteName, exposedModule: string): Promise<T> {
  const traceId = nextTraceId();
  const remoteEntry = getRemoteManifest()[remote];
  const startedAt = new Date().toISOString();
  const start = now();
  const key = `${remote}|${exposedModule}`;
  log.debug('Loading remote', { traceId, remote, exposedModule, remoteEntry });
  try {
    if (simulateFailure(remote)) throw new Error('Simulated failure (?mockFail)');
    if (!remoteEntry) throw new Error(`"${remote}" is not in this environment's manifest`);
    const mod = await loadRemoteModule<T>({ remoteName: remote, remoteEntry, exposedModule });
    const durationMs = measure(`mfe ${remote} ${exposedModule}`, start);
    const first = !loadedOnce.has(key);
    loadedOnce.add(key);
    recordRemoteLoad({
      traceId,
      remote,
      exposedModule,
      remoteEntry,
      startedAt,
      durationMs,
      outcome: first ? 'loaded' : 'cached',
    });
    if (first) log.info('Remote loaded', { traceId, remote, exposedModule, durationMs });
    else log.debug('Remote module (cached)', { traceId, remote, exposedModule, durationMs });
    return mod;
  } catch (reason) {
    const durationMs = Math.round(now() - start);
    const error =
      reason instanceof RemoteLoadError
        ? reason
        : new RemoteLoadError(remote, exposedModule, reason, traceId, remoteEntry);
    recordRemoteLoad({
      traceId,
      remote,
      exposedModule,
      remoteEntry,
      startedAt,
      durationMs,
      outcome: 'failed',
      code: error.code,
      reason: String(reason),
    });
    log.warn('Remote failed to load', {
      traceId,
      remote,
      exposedModule,
      remoteEntry,
      code: error.code,
      hint: error.hint,
      reason: String(reason),
      durationMs,
    });
    logRemoteFailure(error);
    throw error;
  }
}

const preloads = new Map<string, Promise<unknown>>();

/**
 * Downloads a remote module's code without instantiating anything (case tabs preload on case open).
 * Failures are recorded and logged at DEBUG only: the real load on tab open reports them, so an outage is warned once.
 */
export function preloadRemoteModule(remote: RemoteName, exposedModule: string): Promise<unknown> {
  const key = `${remote}|${exposedModule}`;
  if (!preloads.has(key)) {
    const remoteEntry = getRemoteManifest()[remote];
    const traceId = nextTraceId();
    const startedAt = new Date().toISOString();
    const start = now();
    const attempt =
      remoteEntry && !simulateFailure(remote)
        ? loadRemoteModule({ remoteName: remote, remoteEntry, exposedModule }).then(
            () => {
              const durationMs = Math.round(now() - start);
              recordRemoteLoad({
                traceId,
                remote,
                exposedModule,
                remoteEntry,
                startedAt,
                durationMs,
                outcome: 'preloaded',
              });
              log.debug('Remote preloaded', { traceId, remote, exposedModule, durationMs });
            },
            (reason) => {
              preloads.delete(key);
              const code = classifyRemoteError(reason);
              recordRemoteLoad({
                traceId,
                remote,
                exposedModule,
                remoteEntry,
                startedAt,
                durationMs: Math.round(now() - start),
                outcome: 'preload-failed',
                code,
                reason: String(reason),
              });
              log.debug('Remote preload failed (will be reported on open)', { traceId, remote, exposedModule, code });
            },
          )
        : Promise.resolve();
    preloads.set(key, attempt);
  }
  return preloads.get(key) as Promise<unknown>;
}

/** Domain MFEs expose `./Routes` with a default export (or a named `routes`). */
export async function loadRemoteRoutes(remote: RemoteName, exposedModule = './Routes'): Promise<Routes> {
  const mod = await loadRemote<{ default?: Routes; routes?: Routes }>(remote, exposedModule);
  const routes = mod.default ?? mod.routes;
  if (!Array.isArray(routes)) {
    const error = new RemoteLoadError(remote, exposedModule, new Error('No Routes export'));
    log.warn('Remote failed to load', { remote, exposedModule, code: error.code, hint: error.hint });
    throw error;
  }
  return routes;
}

/** Capability MFEs expose ONE standalone component (default export, or the first exported class). */
export async function loadCapability(remote: RemoteName, exposedModule: string): Promise<Type<unknown>> {
  const mod = await loadRemote<Record<string, unknown>>(remote, exposedModule);
  const component = (mod['default'] ?? Object.values(mod).find((v) => typeof v === 'function')) as
    | Type<unknown>
    | undefined;
  if (!component) {
    const error = new RemoteLoadError(remote, exposedModule, new Error('No component export'));
    log.warn('Remote failed to load', { remote, exposedModule, code: error.code, hint: error.hint });
    throw error;
  }
  return component;
}

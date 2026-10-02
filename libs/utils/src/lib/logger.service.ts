/**
 * @file Angular facade over the platform logger (ADR-0025).
 *
 * Inject `LoggerService` in Angular code; use `createLogger(source)` in plain functions. Both write
 * through the same pipeline (lib/log/platform-log.ts). This service also wires the backend sink
 * (LOG_ENDPOINT, from the shell's runtime config) once, when it is first created.
 */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { createLogger, setLogSink, type LogEntry, type LogLevel } from './log/platform-log';

export type { LogEntry, LogLevel };

/** Where warn/error entries are shipped in deployed environments (e.g. '/api/telemetry/logs'). Unset = console only. */
export const LOG_ENDPOINT = new InjectionToken<string | null>('LOG_ENDPOINT', { factory: () => null });

/** One logging client for the whole page (@platform/utils is a federation shared singleton). */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  constructor() {
    const endpoint = inject(LOG_ENDPOINT);
    if (endpoint) setLogSink((entry) => navigator.sendBeacon?.(endpoint, JSON.stringify(entry)));
  }

  debug(message: string, context?: Record<string, unknown>, source = 'app'): void {
    createLogger(source).debug(message, context);
  }
  info(message: string, context?: Record<string, unknown>, source = 'app'): void {
    createLogger(source).info(message, context);
  }
  warn(message: string, context?: Record<string, unknown>, source = 'app'): void {
    createLogger(source).warn(message, context);
  }
  error(message: string, context?: Record<string, unknown>, source = 'app'): void {
    createLogger(source).error(message, context);
  }
}

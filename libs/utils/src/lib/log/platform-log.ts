/**
 * @file Platform-wide structured logging (ADR-0025).
 *
 * One framework-agnostic logger for the whole page, usable from Angular code, plain functions
 * (federation loaders, guards) and mock setup alike. Every line has the same shape so a support engineer
 * can grep the console or the log backend:
 *
 *   [platform] 14:05:01.123 INFO  federation  Remote loaded  { remote: 'mfe-fraud', durationMs: 84, traceId: 'mfe-7' }
 *
 * - Level threshold: `?logLevel=debug` in the URL, or `localStorage['platform.logLevel'] = 'debug'`
 *   (persists across reloads). Default: `info`.
 * - `sessionId` identifies one page load; quote it in bug reports so logs can be correlated server-side.
 * - A single optional sink (set by LoggerService from LOG_ENDPOINT) ships warn/error entries to the backend.
 *
 * Because @platform/utils is a federation shared singleton, the shell and every remote write through this
 * same module instance, with one level, one session id and one sink.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  /** Area of the code, e.g. 'federation', 'shell', 'case-workspace', 'mocks'. */
  source: string;
  message: string;
  context?: Record<string, unknown>;
  /** ISO 8601 */
  at: string;
  sessionId: string;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const STORAGE_KEY = 'platform.logLevel';

/** Random id for this page load (not a user id). */
export const sessionId: string =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

function initialLevel(): LogLevel {
  try {
    const fromUrl = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('logLevel') : null;
    if (fromUrl && fromUrl in ORDER) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl as LogLevel;
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && stored in ORDER) return stored as LogLevel;
  } catch {
    /* storage blocked: fall through */
  }
  return 'info';
}

let threshold: LogLevel = initialLevel();
let sink: ((entry: LogEntry) => void) | null = null;

/** Change the level at runtime (also: `platformDiagnostics().setLogLevel('debug')` in the console). */
export function setLogLevel(level: LogLevel): void {
  threshold = level;
  try {
    localStorage.setItem(STORAGE_KEY, level);
  } catch {
    /* ignore */
  }
}

export function getLogLevel(): LogLevel {
  return threshold;
}

/** Where warn/error entries are shipped (LoggerService wires LOG_ENDPOINT here). One sink per page. */
export function setLogSink(fn: ((entry: LogEntry) => void) | null): void {
  sink = fn;
}

function write(level: LogLevel, source: string, message: string, context?: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[threshold]) return;
  const entry: LogEntry = { level, source, message, context, at: new Date().toISOString(), sessionId };
  const time = entry.at.slice(11, 23);
  const line = `[platform] ${time} ${level.toUpperCase().padEnd(5)} ${source.padEnd(14)} ${message}`;
  const method = level === 'debug' ? 'debug' : level === 'info' ? 'info' : level;
  console[method](line, ...(context ? [context] : []));
  if (sink && ORDER[level] >= ORDER.warn) {
    try {
      sink(entry);
    } catch {
      /* telemetry must never break the page */
    }
  }
}

/** `const log = createLogger('federation'); log.info('Remote loaded', { remote, durationMs })` */
export function createLogger(source: string): Logger {
  return {
    debug: (m, c) => write('debug', source, m, c),
    info: (m, c) => write('info', source, m, c),
    warn: (m, c) => write('warn', source, m, c),
    error: (m, c) => write('error', source, m, c),
  };
}

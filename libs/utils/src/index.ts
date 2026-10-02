/**
 * @file Public API of @platform/utils: logging (+ diagnostics plumbing), HTTP interceptors, formatters.
 * Federation shared singleton (ADR-0008): one instance per page.
 */
export * from './lib/log/platform-log';
export * from './lib/logger.service';
export * from './lib/correlation-id.interceptor';
export * from './lib/http-logging.interceptor';
export * from './lib/formatters';

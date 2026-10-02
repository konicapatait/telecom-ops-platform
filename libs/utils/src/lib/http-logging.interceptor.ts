/**
 * @file Logs every failed API call with its correlation id and duration (ADR-0025).
 *
 * Unexpected failures → WARN `http`. Statuses the caller declared as normal (e.g. 404 = "no decision yet")
 * → DEBUG, so they don't send support chasing non-problems:
 *   http.get(url, { context: expectHttpErrors(404) })
 * Never swallows or transforms errors.
 */
import { HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { createLogger } from './log/platform-log';
import { CORRELATION_HEADER } from './correlation-id.interceptor';

const log = createLogger('http');

/** Statuses that are an expected answer for this request, not a failure. */
export const EXPECTED_HTTP_ERRORS = new HttpContextToken<readonly number[]>(() => []);

/** `{ context: expectHttpErrors(404) }` */
export function expectHttpErrors(...statuses: number[]): HttpContext {
  return new HttpContext().set(EXPECTED_HTTP_ERRORS, statuses);
}

export const httpLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = performance.now();
  return next(req).pipe(
    tap({
      error: (err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) return;
        const context = {
          correlationId: req.headers.get(CORRELATION_HEADER),
          durationMs: Math.round(performance.now() - start),
        };
        const message = `HTTP ${err.status} ${req.method} ${req.urlWithParams}`;
        if (req.context.get(EXPECTED_HTTP_ERRORS).includes(err.status)) log.debug(`${message} (expected)`, context);
        else log.warn(message, context);
      },
    }),
  );
};

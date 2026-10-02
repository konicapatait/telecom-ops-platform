/**
 * @file Tags every API call so backend traces can be joined to UI logs.
 */
import { HttpInterceptorFn } from '@angular/common/http';

export const CORRELATION_HEADER = 'X-Correlation-Id';

/** Tags every API call so backend traces can be joined to UI logs. */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api') || req.headers.has(CORRELATION_HEADER)) return next(req);
  return next(req.clone({ setHeaders: { [CORRELATION_HEADER]: crypto.randomUUID() } }));
};

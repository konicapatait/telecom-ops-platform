/**
 * @file Adds `Authorization: Bearer <token>` to same-origin API calls only, never to remoteEntry or third-party URLs.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

/** Adds `Authorization: Bearer <token>` to same-origin API calls only, never to remoteEntry or third-party URLs. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);
  const auth = inject(AuthService);
  return from(auth.getAccessToken()).pipe(
    switchMap((token) => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
  );
};

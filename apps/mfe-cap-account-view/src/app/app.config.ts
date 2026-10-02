/**
 * @file Providers for mfe-cap-account-view's standalone dev harness (the shell's providers apply when composed).
 */
import {
  ApplicationConfig,
  EnvironmentProviders,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor, provideAuth } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { correlationIdInterceptor } from '@platform/utils';
import { HARNESS_ROUTES } from './harness.routes';

/** Providers for the STANDALONE dev harness. In the shell, the shell's providers apply instead. */
export function harnessConfig(mockProviders: EnvironmentProviders[]): ApplicationConfig {
  return {
    providers: [
      provideZonelessChangeDetection(),
      provideBrowserGlobalErrorListeners(),
      provideRouter(HARNESS_ROUTES, withComponentInputBinding()),
      provideHttpClient(withFetch(), withInterceptors([correlationIdInterceptor, authInterceptor])),
      provideAuth({ issuer: '', clientId: '', redirectUri: location.origin }),
      ...mockProviders,
      provideAppInitializer(() =>
        inject(EntitlementsService)
          .load()
          .catch(() => undefined),
      ),
    ],
  };
}

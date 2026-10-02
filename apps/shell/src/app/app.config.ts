/**
 * @file Providers for shell's standalone dev harness (the shell's providers apply when composed).
 */
import {
  ApplicationConfig,
  EnvironmentProviders,
  ErrorHandler,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { TitleStrategy, provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { authInterceptor, provideAuth } from '@platform/auth';
import { LOG_ENDPOINT, correlationIdInterceptor, httpLoggingInterceptor } from '@platform/utils';
import { appRoutes } from './app.routes';
import { GlobalErrorHandler } from './core/global-error-handler';
import { RUNTIME_CONFIG, RuntimeConfig } from './core/runtime-config';
import { initSession } from './core/session.initializer';
import { ShellTitleStrategy } from './core/title.strategy';
import { ROUTES_FACTORY } from './routing/remote-routes';

export function appConfig(config: RuntimeConfig, mockProviders: EnvironmentProviders[]): ApplicationConfig {
  return {
    providers: [
      provideZonelessChangeDetection(),
      provideBrowserGlobalErrorListeners(),
      provideRouter(appRoutes(), withComponentInputBinding(), withRouterConfig({ onSameUrlNavigation: 'reload' })),
      { provide: ROUTES_FACTORY, useValue: appRoutes },
      { provide: TitleStrategy, useClass: ShellTitleStrategy },
      provideHttpClient(
        withFetch(),
        withInterceptors([correlationIdInterceptor, authInterceptor, httpLoggingInterceptor]),
      ),
      provideAuth({
        issuer: config.okta.issuer,
        clientId: config.okta.clientId,
        redirectUri: location.origin + config.okta.redirectPath,
        postLogoutRedirectUri: location.origin,
      }),
      // Mock overrides come AFTER the real providers so they win (empty in production builds).
      ...mockProviders,
      { provide: RUNTIME_CONFIG, useValue: config },
      { provide: LOG_ENDPOINT, useValue: config.logEndpoint },
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
      provideAppInitializer(initSession),
    ],
  };
}

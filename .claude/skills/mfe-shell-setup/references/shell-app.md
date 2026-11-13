# Shell app: complete code

Files under `apps/shell/`. UI markup uses plain HTML with `<!-- DS: … -->` comments: replace each with your design system's component (app shell, nav list, empty state, skeleton, toast host). Selector prefix: `shell`.

## `src/index.html`
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Platform</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
  </head>
  <body>
    <shell-root></shell-root>
  </body>
</html>
```

## `federation.config.js`
```js
// @file Native Federation config for shell. Shared deps come only from libs/mf-manifest (ADR-0007). The host exposes nothing.
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');
module.exports = withPlatformFederation({ name: 'shell' });
```

## `config/<env>/app-config.json` (runtime config, ADR-0010)
```json
{
  "environment": "dev",
  "okta": { "issuer": "https://<org>.okta.com/oauth2/default", "clientId": "<spa-client-id>", "redirectPath": "/login/callback" },
  "logEndpoint": "/api/telemetry/logs"
}
```
One per `local`, `dev`, `staging`, `prod`. `local` may leave Okta empty (mock auth). The development build copies `config/local/app-config.json` and `libs/mf-manifest/manifests/local/mf-manifest.json` to the dev server root (see workspace.md project.json).

## `src/environments/environment.ts` / `.mock.ts` / `.prod.ts` (build-time flags only)
```ts
/** @file Build-time flags. Environment VALUES (Okta, endpoints) are runtime config: app-config.json (ADR-0010). */
export const environment = {
  build: 'development' as 'development' | 'mock' | 'production', // 'mock' in .mock.ts, 'production' in .prod.ts
  mocks: true,     // false in .prod.ts
  mockAuth: true,  // false in .prod.ts
};
```

## `src/main.ts` (imports NOTHING shared)
```ts
/**
 * @file Shell entry point: federation boot (ADR-0006).
 * 1. fetch this environment's manifest  2. initFederation (shared deps + remotes into the import map)
 * 3. only THEN import anything touching shared packages (./bootstrap). Timings are measured here and logged by bootstrap.
 */
import { initFederation } from '@angular-architects/native-federation';

const manifestUrl = 'mf-manifest.json';
const t0 = performance.now();
let manifestStatus = 'ok';

fetch(manifestUrl, { cache: 'no-cache' })
  .then((res) => {
    if (res.ok) return res.json();
    manifestStatus = `HTTP ${res.status}`;
    return {};
  })
  .catch((err) => {
    manifestStatus = `unreachable: ${String(err)}`;
    return {};
  })
  .then(async (manifest: Record<string, string>) => {
    const t1 = performance.now();
    await initFederation(manifest);
    const t2 = performance.now();
    const { bootstrap } = await import('./bootstrap');
    await bootstrap(manifest, { manifestUrl, manifestStatus, manifestMs: Math.round(t1 - t0), initFederationMs: Math.round(t2 - t1) });
  })
  // The logger does not exist yet: the one place a raw console call is allowed.
  .catch((err) => console.error('[platform] FATAL shell failed to start', err));
```

## `src/bootstrap.ts`
```ts
/** @file Shell bootstrap after initFederation: manifest → runtime config → mocks → Angular; logs a boot summary (ADR-0006, ADR-0016). */
import { bootstrapApplication } from '@angular/platform-browser';
import { installPlatformDiagnostics, setRemoteManifest } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { App } from './app/app';
import { appConfig } from './app/app.config';
import { loadRuntimeConfig } from './app/core/runtime-config';
import { environment } from './environments/environment';
import { startMocks } from './start-mocks';

export interface BootTimings { manifestUrl: string; manifestStatus: string; manifestMs: number; initFederationMs: number }

const log = createLogger('shell');

export async function bootstrap(manifest: Record<string, string>, boot: BootTimings): Promise<void> {
  const start = performance.now();
  setRemoteManifest(manifest);
  if (boot.manifestStatus !== 'ok') log.error('Remote manifest unavailable: every remote section will show "unavailable"', { ...boot });
  log.debug('Remote manifest', { manifest });

  const runtimeConfig = await loadRuntimeConfig();
  const mockProviders = await startMocks(); // before bootstrap, so the very first API call is mocked
  installPlatformDiagnostics({ app: 'shell', build: environment.build, environment: runtimeConfig.environment, mocks: environment.mocks });

  await bootstrapApplication(App, appConfig(runtimeConfig, mockProviders));
  log.info('Shell started', {
    environment: runtimeConfig.environment,
    build: environment.build,
    remotes: Object.keys(manifest).length,
    manifestMs: boot.manifestMs,
    initFederationMs: boot.initFederationMs,
    bootstrapMs: Math.round(performance.now() - start),
  });
}
```

## `src/start-mocks.ts` and `src/start-mocks.prod.ts` (ADR-0005)
```ts
/** @file Mock wiring for the shell. The ONLY place it may import @platform/mocks; replaced in production by fileReplacements. */
import type { EnvironmentProviders } from '@angular/core';
import { provideMockAuth } from '@platform/auth-mock';
import { setRemoteFailureSimulator } from '@platform/mf-manifest';
import { PERSONAS, allHandlers, shouldFailRemote, startMockWorker } from '@platform/mocks';
import { environment } from './environments/environment';

export async function startMocks(): Promise<EnvironmentProviders[]> {
  const providers: EnvironmentProviders[] = [];
  if (environment.mocks) {
    await startMockWorker(allHandlers);
    setRemoteFailureSimulator(shouldFailRemote);
  }
  if (environment.mockAuth) providers.push(provideMockAuth(PERSONAS));
  return providers;
}
```
```ts
/** @file Production stub of start-mocks.ts: no worker, no fixtures, real auth (ADR-0005). */
import type { EnvironmentProviders } from '@angular/core';
export async function startMocks(): Promise<EnvironmentProviders[]> {
  return [];
}
```

## `src/app/core/runtime-config.ts`
```ts
/** @file Per-environment values read at runtime from /app-config.json, so ONE artifact is promoted dev → staging → prod (ADR-0010). */
import { InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  environment: 'local' | 'dev' | 'staging' | 'prod';
  okta: { issuer: string; clientId: string; redirectPath: string };
  logEndpoint: string | null;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>('RUNTIME_CONFIG');

const FALLBACK: RuntimeConfig = { environment: 'local', okta: { issuer: '', clientId: '', redirectPath: '/login/callback' }, logEndpoint: null };

export async function loadRuntimeConfig(url = 'app-config.json'): Promise<RuntimeConfig> {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    return res.ok ? { ...FALLBACK, ...((await res.json()) as Partial<RuntimeConfig>) } : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
```

## `src/app/app.ts`
```ts
/** @file Root component: only the router outlet; the chrome is a route component. */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({ selector: 'shell-root', imports: [RouterOutlet], changeDetection: ChangeDetectionStrategy.OnPush, template: `<router-outlet />` })
export class App {}
```

## `src/app/app.config.ts`
```ts
/** @file Shell providers: zoneless, router via a routes FACTORY (Retry), HTTP interceptors, Okta from runtime config, mocks override. */
import { ApplicationConfig, EnvironmentProviders, ErrorHandler, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
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
      provideHttpClient(withFetch(), withInterceptors([correlationIdInterceptor, authInterceptor, httpLoggingInterceptor])),
      provideAuth({
        issuer: config.okta.issuer,
        clientId: config.okta.clientId,
        redirectUri: location.origin + config.okta.redirectPath,
        postLogoutRedirectUri: location.origin,
      }),
      ...mockProviders, // AFTER the real providers so they win (empty in production)
      { provide: RUNTIME_CONFIG, useValue: config },
      { provide: LOG_ENDPOINT, useValue: config.logEndpoint },
      { provide: ErrorHandler, useClass: GlobalErrorHandler },
      provideAppInitializer(initSession),
    ],
  };
}
```

## `src/app/app.routes.ts`
```ts
/** @file Shell routes: login callback, then the chrome with Home, redirects, one lazy route per remote, forbidden, not-found. */
import type { Routes } from '@angular/router';
import { authGuard } from '@platform/auth';
import { ShellChromeComponent } from './chrome/shell-chrome.component';
import { ForbiddenComponent } from './pages/forbidden.component';
import { HomeComponent } from './pages/home.component';
import { LoginCallbackComponent } from './pages/login-callback.component';
import { NotFoundComponent } from './pages/not-found.component';
import { SHELL_REMOTE_ROUTES } from './routing/remote-registry';
import { redirectRoutes } from './routing/redirects';
import { remoteRoutes } from './routing/remote-routes';

/** A factory, not a constant: Retry rebuilds the config to re-attempt a failed remote (ADR-0006). */
export function appRoutes(): Routes {
  return [
    { path: 'login/callback', component: LoginCallbackComponent },
    {
      path: '',
      component: ShellChromeComponent,
      canActivate: [authGuard],
      children: [
        { path: '', pathMatch: 'full', component: HomeComponent, title: 'Home' },
        ...redirectRoutes(),       // moved/strangled URLs, BEFORE the remotes
        ...remoteRoutes(SHELL_REMOTE_ROUTES),
        // legacy host route goes here (mfe-onboard-legacy-app)
        { path: 'forbidden', component: ForbiddenComponent, title: 'No access' },
        { path: '**', component: NotFoundComponent, title: 'Not found' },
      ],
    },
  ];
}
```

## `src/app/core/session.initializer.ts`
```ts
/** @file App initializer: restore the session, load entitlements, start shell listeners, log router errors and slow navigations. */
import { inject } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { AuthService } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { createLogger } from '@platform/utils';
import { listenForNavigationEvents } from './navigation-events';

const log = createLogger('shell');
const routerLog = createLogger('router');
const SLOW_NAVIGATION_MS = 1500;

export async function initSession(): Promise<void> {
  const auth = inject(AuthService);
  const entitlements = inject(EntitlementsService);
  listenForNavigationEvents();
  logNavigation(inject(Router));

  await auth.init(); // completes the Okta redirect on /login/callback
  if (!auth.isAuthenticated()) {
    log.info('No session: redirecting to sign-in'); // authGuard starts the redirect
    return;
  }
  await entitlements.load().then(
    () => log.info('Session started', { userId: auth.user()?.userId, entitlements: entitlements.count() }),
    (err) => log.error('Entitlements failed to load: the user will see no sections', { reason: String(err) }),
  );
}

function logNavigation(router: Router): void {
  let started = 0;
  router.events.subscribe((e) => {
    if (e instanceof NavigationStart) started = performance.now();
    else if (e instanceof NavigationEnd) {
      const durationMs = Math.round(performance.now() - started);
      if (durationMs > SLOW_NAVIGATION_MS) routerLog.info('Slow navigation', { url: e.urlAfterRedirects, durationMs });
    } else if (e instanceof NavigationCancel) routerLog.debug('Navigation cancelled', { url: e.url, reason: e.reason });
    else if (e instanceof NavigationError) routerLog.error('Navigation failed', { url: e.url, reason: String(e.error) });
  });
}
```

## `src/app/core/navigation-events.ts` (shell owns cross-section navigation, ADR-0017)
```ts
/** @file Remotes ask the shell to navigate with PlatformEvent.OPEN_ROUTE; the shell maps the remote to its registered path. */
import { DestroyRef, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformEvent, PlatformEventBus, isRemoteName } from '@platform/contracts';
import { isRemoteDeployed } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { SHELL_REMOTE_ROUTES } from '../routing/remote-registry';

const log = createLogger('shell');

export function listenForNavigationEvents(): void {
  const router = inject(Router);
  const sub = inject(PlatformEventBus)
    .on(PlatformEvent.OPEN_ROUTE)
    .subscribe(({ remote, subPath }) => {
      const entry = SHELL_REMOTE_ROUTES.find((r) => r.remote === remote);
      if (entry && isRemoteName(remote) && isRemoteDeployed(remote)) {
        void router.navigateByUrl(`/${entry.path}${subPath ? `/${subPath.replace(/^\//, '')}` : ''}`);
      } else {
        log.warn('Navigation target not available here', { remote }); // + a DS toast explaining it
      }
    });
  inject(DestroyRef).onDestroy(() => sub.unsubscribe());
}
```

## `src/app/core/global-error-handler.ts`
```ts
/** @file Last-resort ErrorHandler for the whole page (shell + remotes share this injector) (ADR-0016). */
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { RemoteLoadError } from '@platform/mf-manifest';
import { LoggerService } from '@platform/utils';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);

  handleError(error: unknown): void {
    const err = (error as { rejection?: unknown })?.rejection ?? error;
    if (err instanceof RemoteLoadError) {
      // Already logged with code + hint by the loader; the UI shows the in-place fallback.
      this.logger.debug('Remote load error reached the global handler', { traceId: err.traceId, remote: err.remote }, 'global');
      return;
    }
    this.logger.error(err instanceof Error ? err.message : String(err), { stack: (err as Error)?.stack }, 'global');
    // DS: show ONE toast "Something went wrong. The team has been notified."
  }
}
```

## `src/app/core/title.strategy.ts`
```ts
/** @file Browser tab titles: '<page> · <Product>'. */
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

const PRODUCT = 'Platform';

@Injectable()
export class ShellTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  override updateTitle(snapshot: RouterStateSnapshot): void {
    const page = this.buildTitle(snapshot);
    this.title.setTitle(page ? `${page} · ${PRODUCT}` : PRODUCT);
  }
}
```

## `src/app/routing/remote-registry.ts` (the generator writes here)
```ts
/** @file Shell section registry (maintained by the generator, ADR-0013) and the redirect list. */
import type { RemoteName } from '@platform/contracts';

export interface ShellRemoteRoute {
  remote: RemoteName;
  /** URL segment under the shell, e.g. 'orders'. */
  path: string;
  label: string;
  group: string;
  /** Hide the nav entry unless the user holds this. The remote's own routes still guard themselves. */
  entitlement?: string;
}

export const SHELL_REMOTE_ROUTES: ShellRemoteRoute[] = [
  // <generator:shell-routes>
];

/** Old URL prefix → new home. Remaining segments and query params are kept. Remove once access logs show no hits. */
export const REDIRECTS: { from: string; to: string }[] = [];
```

## `src/app/routing/remote-routes.ts`
```ts
/** @file One lazy route per remote; if it cannot load, ONLY its section shows the fallback (ADR-0006). Fresh objects per call for Retry. */
import { InjectionToken } from '@angular/core';
import type { Routes } from '@angular/router';
import { loadRemoteRoutes } from '@platform/mf-manifest';
import { SectionUnavailableComponent } from '../pages/section-unavailable.component';
import type { ShellRemoteRoute } from './remote-registry';

export const ROUTES_FACTORY = new InjectionToken<() => Routes>('ROUTES_FACTORY');

export function remoteRoutes(registry: readonly ShellRemoteRoute[]): Routes {
  return registry.map((r) => ({
    path: r.path,
    title: r.label,
    loadChildren: () =>
      loadRemoteRoutes(r.remote).catch(() => [
        { path: '**', component: SectionUnavailableComponent, data: { remote: r.remote, label: r.label } },
      ]),
  }));
}
```

## `src/app/routing/redirects.ts` (strangler and renamed URLs)
```ts
/**
 * @file `redirectTo` with a prefix drops the rest of the URL (/old/123?tab=x → /new). A guard rewrites the WHOLE URL instead.
 */
import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { REDIRECTS } from './remote-registry';

export function redirectGuard(from: string, to: string): CanActivateFn {
  return (_route, state) => {
    const [path, query] = state.url.split('?');
    const rest = path.slice(`/${from}`.length);
    return inject(Router).parseUrl(`${to}${rest}${query ? `?${query}` : ''}`);
  };
}

export function redirectRoutes(): Routes {
  return REDIRECTS.map((r) => ({ path: r.from, canActivate: [redirectGuard(r.from, r.to)], children: [{ path: '**', children: [] }] }));
}
```

## `src/app/routing/nav.ts`
```ts
/** @file Nav shows a section only when its remote is in this environment's manifest AND the user is entitled (ADR-0006). */
import type { RemoteName } from '@platform/contracts';
import type { ShellRemoteRoute } from './remote-registry';

export interface NavItem { label: string; path: string; group?: string }

export function visibleNavItems(
  registry: readonly ShellRemoteRoute[],
  isDeployed: (remote: RemoteName) => boolean,
  has: (entitlement: string | undefined) => boolean,
): NavItem[] {
  return [
    { label: 'Home', path: '/' },
    ...registry.filter((r) => isDeployed(r.remote) && has(r.entitlement)).map((r) => ({ label: r.label, path: `/${r.path}`, group: r.group })),
  ];
}
```

## `src/app/chrome/shell-chrome.component.ts` (chrome ONLY, ADR-0002)
```ts
/** @file App chrome ONLY: header, nav, notifications. Everything below belongs to remotes or family layouts (ADR-0002). */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService, PERSONA_SWITCHER } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { isRemoteDeployed } from '@platform/mf-manifest';
import { environment } from '../../environments/environment';
import { SHELL_REMOTE_ROUTES } from '../routing/remote-registry';
import { visibleNavItems } from '../routing/nav';

@Component({
  selector: 'shell-chrome',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- DS: app-shell component with brand / header / nav slots -->
    <header class="chrome__header">
      <span class="chrome__brand">Platform</span>
      @if (mockMode) { <span class="badge" title="All data is mocked (MSW)">Mock data</span> }
      @if (personas; as p) {
        <label>Persona
          <select [value]="p.current().id" (change)="switchPersona($any($event.target).value)">
            @for (o of p.personas; track o.id) { <option [value]="o.id">{{ o.label }}</option> }
          </select>
        </label>
      }
      @if (auth.user(); as user) { <span>{{ user.displayName }}</span> }
      <button type="button" (click)="signOut()">Sign out</button>
    </header>
    <nav aria-label="Primary">
      @for (item of navItems(); track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '/' }">{{ item.label }}</a>
      }
    </nav>
    <main><router-outlet /></main>
    <!-- DS: notification/toast host -->
  `,
})
export class ShellChromeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly personas = inject(PERSONA_SWITCHER, { optional: true });
  private readonly entitlements = inject(EntitlementsService);
  protected readonly mockMode = environment.mocks;
  protected readonly navItems = computed(() => visibleNavItems(SHELL_REMOTE_ROUTES, isRemoteDeployed, (e) => this.entitlements.has(e)));

  protected switchPersona(id: string): void {
    this.personas?.switchTo(id);
    location.reload(); // a persona switch = signing in as someone else
  }
  protected signOut(): void {
    void this.auth.logout();
  }
}
```

## `src/app/chrome/capability-slot.component.ts` (embed one capability anywhere in the chrome or a page)
```ts
/** @file Embeds ONE capability remote with in-place loading/error/Retry; a failure affects this slot only (ADR-0003, ADR-0006). */
import { ChangeDetectionStrategy, Component, ComponentRef, ViewContainerRef, afterNextRender, input, signal, viewChild } from '@angular/core';
import type { RemoteName } from '@platform/contracts';
import { RemoteLoadError, loadCapability } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';

const log = createLogger('shell');

@Component({
  selector: 'shell-capability-slot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-remote]': 'remote()', '[attr.data-state]': 'state()' },
  template: `
    @switch (state()) {
      @case ('loading') { <!-- DS: skeleton --> <div class="skeleton" aria-busy="true"></div> }
      @case ('error') {
        <!-- DS: empty state -->
        <div role="alert">{{ label() }} is unavailable <button type="button" (click)="load()">Retry</button></div>
      }
    }
    <ng-container #outlet />
  `,
})
export class CapabilitySlotComponent {
  readonly remote = input.required<RemoteName>();
  readonly exposedModule = input.required<string>();
  readonly label = input('This section');
  /** Must match the capability's named …Inputs contract. */
  readonly inputs = input<Readonly<Record<string, unknown>>>({});

  private readonly outlet = viewChild.required('outlet', { read: ViewContainerRef });
  private ref?: ComponentRef<unknown>;
  protected readonly state = signal<'loading' | 'ready' | 'error'>('loading');

  constructor() {
    afterNextRender(() => void this.load());
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      const component = await loadCapability(this.remote(), this.exposedModule());
      this.outlet().clear();
      this.ref = this.outlet().createComponent(component);
      for (const [k, v] of Object.entries(this.inputs())) this.ref.setInput(k, v);
      this.state.set('ready');
    } catch (e) {
      this.state.set('error');
      log.warn('Embedded capability unavailable', {
        remote: this.remote(),
        slot: this.label(),
        traceId: e instanceof RemoteLoadError ? e.traceId : undefined,
        code: e instanceof RemoteLoadError ? e.code : undefined,
      });
    }
  }
}
```
If inputs change after load, re-apply them in an `effect` with `this.ref?.setInput(...)`.

## `src/app/pages/section-unavailable.component.ts`
```ts
/** @file Shown in place of ONE section whose remote failed to load; Retry re-attempts without a page reload (ADR-0006). */
import { ChangeDetectionStrategy, Component, afterNextRender, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { createLogger } from '@platform/utils';
import { ROUTES_FACTORY } from '../routing/remote-routes';

const log = createLogger('shell');

@Component({
  selector: 'shell-section-unavailable',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- DS: empty state, icon warning -->
    <section role="alert">
      <h2>This section is unavailable</h2>
      <p>We could not load {{ label() }}. The rest of the platform is still working.</p>
      <button type="button" (click)="retry()">Retry</button>
    </section>
  `,
})
export class SectionUnavailableComponent {
  readonly label = input('this section'); // from route data (withComponentInputBinding)
  readonly remote = input<string>();
  private readonly router = inject(Router);
  private readonly routesFactory = inject(ROUTES_FACTORY);

  constructor() {
    afterNextRender(() => log.warn('Section unavailable', { section: this.label(), remote: this.remote(), url: this.router.url }));
  }

  protected retry(): void {
    log.info('Retrying section', { section: this.label(), remote: this.remote() });
    this.router.resetConfig(this.routesFactory()); // fresh Route objects drop Angular's cached failed lazy load
    void this.router.navigateByUrl(this.router.url);
  }
}
```

## Other pages
```ts
/** @file Okta redirect target; AuthService.init() (initializer) completes the code exchange and restores the original URL. */
@Component({ selector: 'shell-login-callback', changeDetection: ChangeDetectionStrategy.OnPush, template: `<!-- DS: skeleton -->` })
export class LoginCallbackComponent {}

/** @file "No access" page; shows the missing entitlement passed by entitlementGuard (?need=). */
@Component({
  selector: 'shell-forbidden',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h2>You don't have access to this page</h2>
    <p>{{ need() ? 'Required entitlement: ' + need() : 'Ask your administrator if you need access.' }}</p>`,
})
export class ForbiddenComponent { readonly need = input<string>(); }

/** @file Not found, rendered inside the chrome so navigation keeps working. */
@Component({ selector: 'shell-not-found', changeDetection: ChangeDetectionStrategy.OnPush, template: `<h2>Page not found</h2>` })
export class NotFoundComponent {}

/** @file Home: greeting + optional capability slots. */
@Component({
  selector: 'shell-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1>Welcome, {{ auth.user()?.displayName }}</h1>`,
})
export class HomeComponent { protected readonly auth = inject(AuthService); }
```
(Each in its own file under `pages/` with its own `@file` header and imports.)

## `src/styles.css`
Only shell-level layout for the chrome. Global tokens/reset come from the design system and are listed in the shell's `styles` build option; remotes never ship global CSS (ADR-0001).

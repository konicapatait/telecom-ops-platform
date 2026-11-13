# Legacy remote: code templates

Starting points, not drop-ins. Replace `legacy` / `mfe-legacy` / `AppComponent` / `appConfig` with the real names (the route segment, the remote name, the legacy root component and its config). Verify every block in the spike. Angular 17 is the minimum assumed by these templates (`createApplication`, `DestroyRef`, `takeUntilDestroyed`, `ENVIRONMENT_INITIALIZER`).

---

## 1. Contract (shell repo): `libs/legacy-bridge/src/index.ts`
Types only, no Angular import, so the legacy app can use it with any Angular version. Additive changes only.
```ts
/**
 * @file Mount contract between the shell and an isolated legacy remote (own Angular copy, shares nothing).
 * The legacy app's `./Mount` module default-exports or names a `mount` function of type LegacyMountFn.
 */
export interface LegacyUser { userId: string; displayName: string; email: string }

export interface LegacyMountContext {
  /** Contract version, bumped on additive changes, so the legacy side can feature-detect. */
  readonly contractVersion: 1;
  /** URL prefix the legacy app owns, with leading and trailing slash, e.g. '/legacy/'. */
  readonly basePath: string;
  readonly environment: 'local' | 'dev' | 'staging' | 'prod';
  /** Same-origin API base behind CloudFront, e.g. '/api'. */
  readonly apiBase: string;
  /** Needed only for the zero-code token option (legacy keeps its Okta SDK, reads the shell's tokens). */
  readonly okta: { issuer: string; clientId: string };
  readonly auth: {
    user(): LegacyUser | null;
    isAuthenticated(): boolean;
    getAccessToken(): Promise<string | null>;
    /** Starts the shell's Okta redirect; the user comes back to returnUrl. */
    login(returnUrl: string): void;
    logout(): void;
  };
  /** Entitlements loaded once by the shell after sign-in. */
  readonly entitlements: readonly string[];
  /** Ask the shell to navigate (outside the legacy base path, or to a strangled screen). */
  navigate(url: string): void;
  /** Legacy reports its own completed navigations (full URL incl. base path) so the shell router stays in sync. */
  onNavigated(url: string): void;
  /** Returns the new URL if the shell now owns this legacy URL (strangler), else null. */
  shellOwned(url: string): string | null;
  /** Forward to the shell logger. Never pass tokens or personal data. */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>): void;
  correlationId(): string;
}

export interface LegacyMountHandle {
  /** The shell changed the URL inside the legacy base path. */
  navigate(url: string): Promise<void>;
  unmount(): Promise<void>;
}

export type LegacyMountFn = (host: HTMLElement, ctx: LegacyMountContext) => Promise<LegacyMountHandle>;
```

## 2. Legacy repo: `federation.config.js`
Use the Native Federation major that matches the **legacy** Angular major.
```js
// Isolated remote: exposes ./Mount and shares NOTHING with the shell (own Angular, zone.js, design library).
const { withNativeFederation } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-legacy',
  exposes: { './Mount': './src/mount.ts' },
  shared: {},          // check dist/.../remoteEntry.json: "shared": []
  sharedMappings: [],
  skip: [],
});
```

## 3. Legacy repo: build targets (`angular.json` excerpt)
Keep `build` / `serve` as they are. Add a `federation` configuration on the esbuild target and a `federation` target that wraps it. (The NF `init` schematic instead renames `build` → `esbuild`; either layout works. If it rewrote `main.ts`, revert that file.)
```jsonc
"build": {
  "builder": "@angular-devkit/build-angular:application",
  "options": { "...": "unchanged" },
  "configurations": {
    "production": { "...": "unchanged" },
    "federation": {
      "outputPath": "dist/legacy-mfe",
      "outputHashing": "media",        // stable styles.css / chunk names; the S3 version folder is immutable anyway
      "serviceWorker": false,           // a root-scoped SW would take over the shell's origin
      "optimization": true,
      "sourceMap": { "scripts": true, "hidden": true }
    }
  }
},
"federation": {
  "builder": "@angular-architects/native-federation:build",
  "options": {},
  "configurations": {
    "production": { "target": "legacy:build:federation" },
    "development": { "target": "legacy:build:development", "dev": true }
  },
  "defaultConfiguration": "production"
}
```
Local composed dev: serve the federation target on a fixed port (e.g. 4300) and point the shell's local manifest at `http://localhost:4300/remoteEntry.json`.

## 4. Legacy repo: `src/mount.ts`
```ts
/**
 * @file Exposed as ./Mount. Boots the legacy app inside a host element owned by the shell.
 * The standalone app (main.ts) is untouched; this file is used only when composed.
 */
import type { LegacyMountContext, LegacyMountHandle } from '@platform/legacy-bridge';

const SCOPE = 'legacy';

export async function mount(host: HTMLElement, ctx: LegacyMountContext): Promise<LegacyMountHandle> {
  // The zoneless shell does not load zone.js; the legacy app needs it before bootstrap. Load once per page.
  if (!(globalThis as { Zone?: unknown }).Zone) await import('zone.js');

  const assetBase = new URL('./', import.meta.url).href; // .../mfe/mfe-legacy/<version>/
  ensureGlobalStyles(assetBase);

  const scope = document.createElement('div');
  scope.setAttribute('data-mfe', SCOPE);
  const root = document.createElement('app-root'); // AppComponent's selector
  scope.appendChild(root);
  host.appendChild(scope);

  // Import Angular only after zone.js is in place.
  const { bootstrapMounted } = await import('./mount-bootstrap');
  return bootstrapMounted({ scope, root, ctx, assetBase });
}

function ensureGlobalStyles(assetBase: string): void {
  if (document.querySelector(`link[data-mfe="${SCOPE}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${assetBase}styles.css`; // global CSS, already prefixed with [data-mfe="legacy"] at build time
  link.setAttribute('data-mfe', SCOPE);
  document.head.appendChild(link);
}

export default mount;
```

## 5a. Legacy repo: `src/mount-bootstrap.ts` (standalone bootstrap)
```ts
/**
 * @file Creates the legacy Angular application inside the shell's host element and returns the mount handle.
 */
import { NgZone } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import type { LegacyMountContext, LegacyMountHandle } from '@platform/legacy-bridge';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { platformAdapterProviders } from './app/platform-adapter/providers';

export async function bootstrapMounted(opts: {
  scope: HTMLElement; root: HTMLElement; ctx: LegacyMountContext; assetBase: string;
}): Promise<LegacyMountHandle> {
  const { scope, root, ctx, assetBase } = opts;
  const appRef = await createApplication({
    // Adapter providers come AFTER the app's own, so they override (base href, config, auth, overlay).
    providers: [...appConfig.providers, ...platformAdapterProviders(ctx, scope, assetBase)],
  });
  const zone = appRef.injector.get(NgZone);
  zone.run(() => appRef.bootstrap(AppComponent, root));

  const router = appRef.injector.get(Router);
  const base = ctx.basePath.replace(/\/$/, '');
  const toLegacyUrl = (url: string) => (url.startsWith(base) ? url.slice(base.length) || '/' : url);

  return {
    navigate: (url) =>
      zone.run(async () => {
        const target = toLegacyUrl(url);
        if (router.url !== target) await router.navigateByUrl(target, { replaceUrl: true }); // shell already pushed the URL
      }),
    unmount: async () => {
      zone.run(() => appRef.destroy());
      scope.remove(); // also removes the scoped overlay container
    },
  };
}
```

## 5b. NgModule apps (instead of 5a)
```ts
@NgModule({ imports: [AppModule], providers: [] })
export class MountModule implements DoBootstrap {
  constructor(@Inject(LEGACY_ROOT) private readonly root: HTMLElement) {}
  ngDoBootstrap(appRef: ApplicationRef): void { appRef.bootstrap(AppComponent, this.root); }
}
// in bootstrapMounted:
const platform = platformBrowser([{ provide: LEGACY_ROOT, useValue: root }]);
const moduleRef = await platform.bootstrapModule(MountModule, { /* adapter providers go into MountModule via a static forMount(ctx) */ });
// unmount: moduleRef.destroy(); platform.destroy(); scope.remove();
```
Remove `bootstrap: [AppComponent]` from the module used here (or wrap as above) so Angular does not search the document for `app-root`.

## 6. Legacy repo: `src/app/platform-adapter/providers.ts`
```ts
/**
 * @file Providers used ONLY when the legacy app is mounted in the shell. Standalone mode never sees them.
 */
import { APP_BASE_HREF, Location } from '@angular/common';
import { DestroyRef, ENVIRONMENT_INITIALIZER, InjectionToken, Provider, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Route, Router, UrlSegment } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { filter } from 'rxjs';
import type { LegacyMountContext } from '@platform/legacy-bridge';
import { ScopedOverlayContainer } from './scoped-overlay-container';
import { RedirectingComponent } from './redirecting.component';

/** null in standalone mode; the mount context when composed. Legacy code may inject it (Phase 2b). */
export const PLATFORM_CONTEXT = new InjectionToken<LegacyMountContext | null>('PLATFORM_CONTEXT', {
  providedIn: 'root', factory: () => null,
});
export const LEGACY_SCOPE_ROOT = new InjectionToken<HTMLElement>('LEGACY_SCOPE_ROOT');
export const ASSET_BASE = new InjectionToken<string>('ASSET_BASE', { providedIn: 'root', factory: () => '' });

export function platformAdapterProviders(ctx: LegacyMountContext, scope: HTMLElement, assetBase: string): Provider[] {
  return [
    { provide: PLATFORM_CONTEXT, useValue: ctx },
    { provide: LEGACY_SCOPE_ROOT, useValue: scope },
    { provide: ASSET_BASE, useValue: assetBase },
    { provide: APP_BASE_HREF, useValue: ctx.basePath },
    { provide: OverlayContainer, useClass: ScopedOverlayContainer },
    // Replace with the app's real config token:
    // { provide: APP_CONFIG, useValue: { ...defaults, apiUrl: ctx.apiBase } },
    { provide: ENVIRONMENT_INITIALIZER, multi: true, useValue: () => connectRouter(ctx) },
  ];
}

/** Keeps the shell router in sync and hands strangled URLs to the shell. Runs before the initial navigation. */
function connectRouter(ctx: LegacyMountContext): void {
  const router = inject(Router);
  const location = inject(Location);
  router.resetConfig([shellOwnedRoute(ctx), ...router.config]);
  router.events
    .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(() => ctx.onNavigated(location.prepareExternalUrl(router.url)));
}

/** Matches any URL the shell now owns (strangler) and hands it over; legacy screens stay untouched. */
function shellOwnedRoute(ctx: LegacyMountContext): Route {
  const owned = (segments: UrlSegment[]) => ctx.shellOwned(ctx.basePath + segments.map((s) => s.path).join('/'));
  return {
    matcher: (segments) => (owned(segments) ? { consumed: segments } : null),
    canMatch: [(_r: Route, segments: UrlSegment[]) => {
      const target = owned(segments);
      if (target) ctx.navigate(target);
      return !!target;
    }],
    component: RedirectingComponent, // renders nothing while the shell navigates away
  };
}
```
Query parameters are not part of `segments`; if a strangled screen needs them, read `router.getCurrentNavigation()?.extractedUrl` inside the guard.

## 7. Legacy repo: `scoped-overlay-container.ts`
```ts
/**
 * @file CDK overlays (dialogs, menus, tooltips) render inside the legacy scope, so its prefixed CSS applies
 * and unmount removes them.
 */
import { Injectable, inject } from '@angular/core';
import { OverlayContainer } from '@angular/cdk/overlay';
import { LEGACY_SCOPE_ROOT } from './providers';

@Injectable()
export class ScopedOverlayContainer extends OverlayContainer {
  private readonly scopeRoot = inject(LEGACY_SCOPE_ROOT);

  protected override _createContainer(): void {
    const container = this._document.createElement('div');
    container.classList.add('cdk-overlay-container');
    this.scopeRoot.appendChild(container);
    this._containerElement = container;
  }
}
```
Libraries that do not use CDK (PrimeNG `appendTo`, ngx-bootstrap `container`, custom `document.body.appendChild`) must be pointed at the scope root too; list them in the spike.

## 8. Legacy repo: auth options
**Phase 2a, zero code in screens: reuse the shell's tokens through the Okta SDK.**
okta-auth-js keeps tokens in `localStorage` under `okta-token-storage` by default, whatever the client id. So the shell and the legacy app **must** use the same Okta client (or the shell must use a different `storageKey`). Mounted mode:
```ts
import { OktaAuth } from '@okta/okta-auth-js';
import { OKTA_CONFIG } from '@okta/okta-angular';

const oktaAuth = new OktaAuth({
  issuer: ctx.okta.issuer,
  clientId: ctx.okta.clientId,
  redirectUri: location.origin + '/login/callback', // the SHELL's callback; legacy never redirects in mounted mode
  tokenManager: { autoRenew: false, autoRemove: false },
  services: { autoRenew: false, autoRemove: false, syncStorage: true },
});
// do NOT call oktaAuth.start(): the shell's client is the only one that renews
{ provide: OKTA_CONFIG, useValue: { oktaAuth, onAuthRequired: () => ctx.auth.login(location.pathname + location.search) } }
```
Check in the spike: the token storage format is the same between the legacy's okta-auth-js version and the shell's; `@okta/okta-angular` does not start services on its own in your version.

**Phase 2b, end state: the bridge.** In the legacy auth interceptor and guard:
```ts
const platform = inject(PLATFORM_CONTEXT);
const token = platform ? await platform.auth.getAccessToken() : await this.oktaAuth.getAccessToken();
// on 401: platform ? platform.auth.login(location.pathname + location.search) : this.oktaAuth.signInWithRedirect();
```

## 9. Legacy repo: global CSS scoping (PostCSS)
```js
// postcss.config.js (Angular esbuild picks it up from the project root since v17.x; verify for your version)
module.exports = {
  plugins: [
    require('postcss-prefix-selector')({
      prefix: '[data-mfe="legacy"]',
      transform: (prefix, selector, prefixed) =>
        /^(html|body|:root)\b/.test(selector) ? selector.replace(/^(html|body|:root)/, prefix) : prefixed,
      exclude: [/^\[data-mfe/, /^@/],
    }),
  ],
};
```
Apply it only to the federation configuration if the standalone app must stay byte-identical (separate postcss config path or a build-time env switch). Scope `@font-face` names and CSS custom properties if they clash with the shell's `--ds-*` (they usually do not).

## 10. Shell repo: `libs/mf-manifest` addition
```ts
/** @file Loads an isolated legacy remote's ./Mount through the traced loader (ADR-0016) and mounts it. */
import type { LegacyMountContext, LegacyMountFn, LegacyMountHandle } from '@platform/legacy-bridge';
import type { RemoteName } from '@platform/contracts';
import { loadRemote } from './load-remote';

export async function mountLegacy(
  remote: RemoteName, host: HTMLElement, ctx: LegacyMountContext, exposedModule = './Mount',
): Promise<LegacyMountHandle> {
  const mod = await loadRemote<{ default?: LegacyMountFn; mount?: LegacyMountFn }>(remote, exposedModule);
  const mount = mod.mount ?? mod.default;
  if (typeof mount !== 'function') throw new Error(`${remote} ${exposedModule} has no mount()`);
  return mount(host, ctx);
}
```

## 11. Shell repo: `apps/shell/src/app/legacy/legacy-host.component.ts`
```ts
/**
 * @file Hosts the isolated legacy remote under /legacy/**, keeps both routers in sync, unmounts on leave.
 */
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { mountLegacy } from '@platform/mf-manifest';
import { createLogger, newCorrelationId } from '@platform/utils';  // see mfe-shell-setup libs.md
import type { LegacyMountHandle } from '@platform/legacy-bridge';
import { RUNTIME_CONFIG } from '../core/runtime-config';
import { shellOwnedLegacyUrl } from './legacy-strangler';

const BASE = '/legacy/';
const log = createLogger('legacy');

@Component({
  selector: 'shell-legacy-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (failed()) {
      <!-- DS: empty state, same wording as the shell's SectionUnavailableComponent -->
      <p role="alert">This section is unavailable.</p>
      <button type="button" (click)="retry()">Retry</button>
    }
    <div #host class="legacy-host"></div>
  `,
})
export class LegacyHostComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly entitlements = inject(EntitlementsService);
  private readonly config = inject(RUNTIME_CONFIG);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  protected readonly failed = signal(false);
  private handle?: LegacyMountHandle;
  private lastLegacyUrl = '';

  constructor() {
    afterNextRender(() => void this.mount());
    const sub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (e.urlAfterRedirects.startsWith(BASE) && e.urlAfterRedirects !== this.lastLegacyUrl) {
          void this.handle?.navigate(e.urlAfterRedirects);
        }
      });
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      void this.handle?.unmount();
    });
  }

  protected retry(): void {
    this.failed.set(false);
    void this.mount();
  }

  private async mount(): Promise<void> {
    try {
      this.handle = await mountLegacy('mfe-legacy', this.host().nativeElement, {
        contractVersion: 1,
        basePath: BASE,
        environment: this.config.environment,
        apiBase: '/api',
        okta: { issuer: this.config.okta.issuer, clientId: this.config.okta.clientId },
        auth: {
          user: () => this.auth.user(),
          isAuthenticated: () => this.auth.isAuthenticated(),
          getAccessToken: () => this.auth.getAccessToken(),
          login: (returnUrl) => void this.auth.login(returnUrl),
          logout: () => void this.auth.logout(),
        },
        entitlements: [...this.entitlements.entitlements()],
        navigate: (url) => void this.router.navigateByUrl(url),
        onNavigated: (url) => {
          this.lastLegacyUrl = url;
          if (this.router.url !== url) void this.router.navigateByUrl(url, { replaceUrl: true });
        },
        shellOwned: shellOwnedLegacyUrl,
        log: (level, message, context) => log[level](message, context),
        correlationId: newCorrelationId,
      });
    } catch (err) {
      this.failed.set(true); // loadRemote already logged code + hint
    }
  }
}
```
`RUNTIME_CONFIG`, `AuthService`, `EntitlementsService`, `createLogger`, `newCorrelationId` and `mountLegacy` are the shell APIs from **mfe-shell-setup** (`shell-app.md`, `libs.md`). Route registration in the shell's `app.routes.ts` (before `forbidden` / `**`):
```ts
...legacyStranglerRoutes(),   // guard-based redirects, BEFORE the legacy route
{ path: 'legacy', canActivate: [entitlementGuard('legacy:view')], children: [{ path: '**', component: LegacyHostComponent }] },
```
`legacy-strangler.ts` holds one list `{ from: '/legacy/orders/', to: '/orders/' }[]` used by both the redirect guards and `shellOwnedLegacyUrl`.

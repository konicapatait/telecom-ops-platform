# Shared libraries: complete code

Create each lib with `npx nx g @nx/angular:library libs/<name> --importPath=@platform/<name> --standalone --unitTestRunner=vitest` (or `@nx/js:library` for framework-free ones), then replace the sources with the files below. Set the tags shown in each lib's `project.json`. Every lib's tsconfig path must exist in `tsconfig.base.json` (see workspace.md).

| Lib | Import path | Tags | Shared at runtime? |
| --- | --- | --- | --- |
| contracts | `@platform/contracts` | `type:contracts`, `scope:shared` | yes (sharedMappings) |
| mf-manifest | `@platform/mf-manifest` | `type:shared-lib`, `scope:shared` | yes |
| auth | `@platform/auth` | `type:shared-lib`, `scope:shared` | yes |
| auth mock | `@platform/auth-mock` (folder `libs/auth/mock`) | `type:mocks`, `scope:shared` | **no** (non-prefix name on purpose) |
| entitlements | `@platform/entitlements` | `type:shared-lib`, `scope:shared` | yes |
| utils | `@platform/utils` | `type:shared-lib`, `scope:shared` | yes |
| mocks | `@platform/mocks` | `type:mocks`, `scope:shared` | **no** |
| legacy-bridge | `@platform/legacy-bridge` | `type:contracts`, `scope:shared` | no (types only; see mfe-onboard-legacy-app) |

Why `@platform/auth-mock` and not `@platform/auth/mock`: Native Federation externalises sub-paths of a shared mapping, and an unshared sub-path then fails at runtime with `Unable to resolve specifier`. Unshared entry points get a name that is not a prefix-extension of a shared one.

---

## libs/contracts

### `src/index.ts`
```ts
// @platform/contracts: every cross-MFE type lives here. Changes are ADDITIVE ONLY and need platform-owner review (ADR-0004).
export * from './lib/identity';
export * from './lib/remotes';
export * from './lib/events';
export * from './lib/event-bus';
```

### `src/lib/identity.ts`
```ts
/** @file Identity types every MFE sees: the signed-in user, mock personas, the entitlements response. */

/** The signed-in user as every MFE sees it. Read-only outside the shell. */
export interface AuthUser {
  userId: string;
  displayName: string;
  email: string;
}

/** A mock-mode identity. Real environments never see personas. */
export interface Persona extends AuthUser {
  id: string; // e.g. 'analyst' | 'supervisor' | 'auditor'
  label: string;
  entitlements: string[];
}

export interface EntitlementsResponse {
  entitlements: string[];
  featureFlags: Record<string, boolean>;
}
```

### `src/lib/remotes.ts`
```ts
/**
 * @file Every federation remote, by its key in mf-manifest.json. Maintained by the generator (ADR-0013); do not hand-edit.
 */
export const REMOTE_NAMES = [
  // <generator:remote-names>
] as const;

export type RemoteName = (typeof REMOTE_NAMES)[number];

export function isRemoteName(value: string): value is RemoteName {
  return (REMOTE_NAMES as readonly string[]).includes(value);
}
```
While the list is empty, `RemoteName` is `never`; that is fine until the first remote is generated.

### `src/lib/events.ts`
```ts
/** @file Cross-MFE events (versioned names) and their payloads (ADR-0004, ADR-0017). */

/** Names are versioned: never change a payload, add a `.v2` event instead. */
export enum PlatformEvent {
  /** Ask the shell to open a section/record it owns the URL for. */
  OPEN_ROUTE = 'nav.route.open.v1',
  // Domain examples: RECORD_UPDATED = 'record.updated.v1',
}

export interface PlatformEventPayloads {
  [PlatformEvent.OPEN_ROUTE]: { remote: string; subPath?: string };
}

export interface PlatformEventMessage<E extends PlatformEvent = PlatformEvent> {
  type: E;
  payload: PlatformEventPayloads[E];
}
```

### `src/lib/event-bus.ts`
```ts
/** @file Typed fire-and-forget bus between unrelated MFEs; one instance per page because contracts is a shared singleton. */
import { Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { PlatformEvent, PlatformEventMessage, PlatformEventPayloads } from './events';

@Injectable({ providedIn: 'root' })
export class PlatformEventBus {
  private readonly events$ = new Subject<PlatformEventMessage>();

  emit<E extends PlatformEvent>(type: E, payload: PlatformEventPayloads[E]): void {
    this.events$.next({ type, payload } as PlatformEventMessage);
  }

  on<E extends PlatformEvent>(type: E): Observable<PlatformEventPayloads[E]> {
    return this.events$.pipe(
      filter((e): e is PlatformEventMessage<E> => e.type === type),
      map((e) => e.payload),
    );
  }
}
```
Shared state between MFEs (e.g. "current record") goes in small signal stores here with **one writer** each; consumers read only. Channel order, narrowest first: component inputs → context store → event bus → read-only shell singletons.

---

## libs/mf-manifest

### `src/shared.config.js` (THE only federation shared block, ADR-0007)
```js
// @ts-check
/**
 * THE ONLY federation shared block in the workspace (ADR-0007).
 * Every apps/<app>/federation.config.js calls `withPlatformFederation(...)` from here.
 * `npm run check:shared-config` fails CI if any app declares its own `shared`, `share(` or `shareAll(`.
 */
const { withNativeFederation, share } = require('@angular-architects/native-federation/config');

const singleton = { singleton: true, strictVersion: true, requiredVersion: 'auto' };

/** npm packages loaded ONCE per page. Anything Angular-runtime-shaped must be here, or two copies will fight. */
const sharedDeps = share({
  '@angular/core': singleton,
  '@angular/common': singleton,
  '@angular/router': singleton,
  '@angular/forms': singleton,
  '@angular/platform-browser': singleton,
  '@angular/cdk': singleton,
  rxjs: singleton,
  tslib: singleton,
  // Your design system: build-time npm package, runtime singleton, NEVER a remote (ADR-0001).
  '@org/design-system': singleton,
});

/** Monorepo libs shared as singletons, so DI services (AuthService, EntitlementsService, PlatformEventBus) are ONE instance. */
const sharedMappings = [
  '@platform/contracts',
  '@platform/mf-manifest',
  '@platform/auth',
  '@platform/entitlements',
  '@platform/utils',
];

const skip = [
  'rxjs/ajax',
  'rxjs/fetch',
  'rxjs/testing',
  'rxjs/webSocket',
  '@angular/core/testing',
  '@angular/common/http/testing',
  '@angular/router/testing',
  '@angular/platform-browser/testing',
  /^@angular\/cdk\/.*testing/,
  // Only if @angular/animations is not installed:
  '@angular/platform-browser/animations',
  '@angular/platform-browser/animations/async',
  'msw',
  'msw/browser',
  'msw/node',
  '@okta/okta-auth-js', // lazy-loaded by the shell only
];

/** @param {{ name: string; exposes?: Record<string, string> }} options */
function withPlatformFederation({ name, exposes = {} }) {
  return withNativeFederation({
    name,
    exposes,
    shared: sharedDeps,
    sharedMappings,
    skip,
    // MUST stay false (ADR-0007). With `true`, the host omits secondaries it doesn't import itself
    // (e.g. @angular/core/rxjs-interop); a remote then supplies its own build with a second copy of core
    // state, and rxResource/toSignal fail with NG0203 at runtime.
    features: { ignoreUnusedDeps: false },
  });
}

module.exports = { sharedDeps, sharedMappings, skip, withPlatformFederation };
```
Remove packages you do not install (`@angular/cdk`, `@angular/forms`) or add ones you do (`@angular/aria`, `@angular/material`), always exact-pinned in `package.json`.

### `manifests/<env>/mf-manifest.json`
`local`: `{}` at first; the generator adds `"mfe-x": "http://localhost:<port>/remoteEntry.json"`. `dev`/`staging`/`prod`: `{}` seeds; deploy jobs write the real entries in the bucket.

### `src/index.ts`
```ts
/** @file Public API of @platform/mf-manifest: runtime manifest, the ONLY remote loaders, diagnostics (ADR-0006, ADR-0016). */
export * from './lib/manifest';
export * from './lib/load-remote';
export * from './lib/diagnostics';
export * from './lib/platform-diagnostics';
```

### `src/lib/manifest.ts`
```ts
/** @file The runtime remote manifest ({ remote → remoteEntry.json URL }) for this environment, set once at boot (ADR-0006). */
import { isRemoteName, type RemoteName } from '@platform/contracts';

export type RemoteManifest = Partial<Record<RemoteName, string>>;

let manifest: RemoteManifest = {};

/** Called once by the shell (or a remote's standalone harness) with the manifest it booted with. */
export function setRemoteManifest(value: Record<string, string>): void {
  const clean: RemoteManifest = {};
  for (const [name, url] of Object.entries(value ?? {})) {
    if (isRemoteName(name) && typeof url === 'string' && url.length > 0) clean[name] = url;
  }
  manifest = clean;
}

export function getRemoteManifest(): Readonly<RemoteManifest> {
  return manifest;
}

export function isRemoteDeployed(remote: RemoteName): boolean {
  return !!manifest[remote];
}
```

### `src/lib/diagnostics.ts`
```ts
/**
 * @file Classifies remote-load failures and keeps a history of every load (ADR-0016).
 * Support flow for "section unavailable": console `WARN federation Remote failed to load` (code, hint, remoteEntry, traceId)
 * → `platformDiagnostics()` → `?logLevel=debug`.
 */
import type { RemoteName } from '@platform/contracts';

export type RemoteErrorCode =
  | 'NOT_IN_MANIFEST'
  | 'REMOTE_ENTRY_UNREACHABLE'
  | 'EXPOSED_MODULE_MISSING'
  | 'MODULE_IMPORT_FAILED'
  | 'NO_EXPORT'
  | 'SIMULATED'
  | 'UNKNOWN';

export const REMOTE_ERROR_HINTS: Record<RemoteErrorCode, string> = {
  NOT_IN_MANIFEST: "No entry in this environment's mf-manifest.json. Deploy the remote or check its name.",
  REMOTE_ENTRY_UNREACHABLE: 'remoteEntry.json could not be fetched. Is it deployed at that URL? Check the manifest URL and CloudFront.',
  EXPOSED_MODULE_MISSING: "The deployed remote does not expose this module. Compare its federation.config.js 'exposes'; run contract smoke.",
  MODULE_IMPORT_FAILED: 'remoteEntry loaded but the module failed to import. Check shared versions (strictVersion), tsconfig path mappings and stale caches.',
  NO_EXPORT: 'The module loaded but has no usable export (default Routes / a component class / mount).',
  SIMULATED: 'Simulated with ?mockFail=<remote> (mock builds only).',
  UNKNOWN: 'Unclassified. See `reason` and the network tab for this remote.',
};

export function classifyRemoteError(reason: unknown): RemoteErrorCode {
  const text = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  if (/Simulated failure/i.test(text)) return 'SIMULATED';
  if (/not in this environment's manifest/i.test(text)) return 'NOT_IN_MANIFEST';
  if (/Unknown exposed module/i.test(text)) return 'EXPOSED_MODULE_MISSING';
  if (/No (Routes|component|mount) export/i.test(text)) return 'NO_EXPORT';
  if (/Unable to resolve specifier|dynamically imported module|importShim|SyntaxError/i.test(text)) return 'MODULE_IMPORT_FAILED';
  if (/Failed to fetch|NetworkError|Load failed|ERR_|remoteEntry|unknown remote|Error loading remote entry|JSON/i.test(text))
    return 'REMOTE_ENTRY_UNREACHABLE';
  return 'UNKNOWN';
}

export interface RemoteLoadRecord {
  traceId: string;
  remote: RemoteName;
  exposedModule: string;
  remoteEntry?: string;
  startedAt: string;
  durationMs: number;
  outcome: 'loaded' | 'cached' | 'failed' | 'preloaded' | 'preload-failed';
  code?: RemoteErrorCode;
  reason?: string;
}

const MAX_RECORDS = 200;
const records: RemoteLoadRecord[] = [];
let traceSeq = 0;

export const nextTraceId = (): string => `mfe-${++traceSeq}`;

export function recordRemoteLoad(record: RemoteLoadRecord): void {
  records.push(record);
  if (records.length > MAX_RECORDS) records.shift();
}

export const getRemoteLoadRecords = (): readonly RemoteLoadRecord[] => records;
```

### `src/lib/load-remote.ts`
```ts
/**
 * @file The ONLY way the platform loads remote code (ADR-0006, ADR-0016). Every load is traced: trace id, timing
 * (also a performance.measure), on failure a code + hint, and a record in the diagnostics history.
 * Logging (source `federation`): first load INFO, repeats DEBUG, failures WARN (every attempt), preloads DEBUG.
 */
import type { Type } from '@angular/core';
import type { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import type { RemoteName } from '@platform/contracts';
import { createLogger } from '@platform/utils';
import { REMOTE_ERROR_HINTS, classifyRemoteError, nextTraceId, recordRemoteLoad, type RemoteErrorCode } from './diagnostics';
import { getRemoteManifest } from './manifest';

const log = createLogger('federation');

export class RemoteLoadError extends Error {
  readonly code: RemoteErrorCode;
  readonly hint: string;
  constructor(
    readonly remote: RemoteName,
    readonly exposedModule: string,
    readonly reason: unknown,
    readonly traceId = '',
    readonly remoteEntry?: string,
  ) {
    super(`Remote "${remote}" (${exposedModule}) failed to load`);
    this.name = 'RemoteLoadError';
    this.code = classifyRemoteError(reason);
    this.hint = REMOTE_ERROR_HINTS[this.code];
  }
}

let simulateFailure: (remote: RemoteName) => boolean = () => false;
/** Dev-only hook; mock builds wire it to `?mockFail=<remote>`. */
export function setRemoteFailureSimulator(fn: (remote: RemoteName) => boolean): void {
  simulateFailure = fn;
}

const listeners = new Set<(error: RemoteLoadError) => void>();
export function onRemoteFailure(listener: (error: RemoteLoadError) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const loadedOnce = new Set<string>();
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Always passes the manifest URL, so a remote that was DOWN at boot is registered on Retry. */
export async function loadRemote<T = unknown>(remote: RemoteName, exposedModule: string): Promise<T> {
  const traceId = nextTraceId();
  const remoteEntry = getRemoteManifest()[remote];
  const startedAt = new Date().toISOString();
  const start = now();
  const key = `${remote}|${exposedModule}`;
  log.debug('Loading remote', { traceId, remote, exposedModule, remoteEntry });
  try {
    if (simulateFailure(remote)) throw new Error('Simulated failure (?mockFail)');
    if (!remoteEntry) throw new Error(`"${remote}" is not in this environment's manifest`);
    const mod = await loadRemoteModule<T>({ remoteName: remote, remoteEntry, exposedModule });
    const end = now();
    try { performance.measure(`mfe ${remote} ${exposedModule}`, { start, end }); } catch { /* old browsers / tests */ }
    const durationMs = Math.round(end - start);
    const first = !loadedOnce.has(key);
    loadedOnce.add(key);
    recordRemoteLoad({ traceId, remote, exposedModule, remoteEntry, startedAt, durationMs, outcome: first ? 'loaded' : 'cached' });
    if (first) log.info('Remote loaded', { traceId, remote, exposedModule, durationMs });
    else log.debug('Remote module (cached)', { traceId, remote, exposedModule, durationMs });
    return mod;
  } catch (reason) {
    const durationMs = Math.round(now() - start);
    const error = reason instanceof RemoteLoadError ? reason : new RemoteLoadError(remote, exposedModule, reason, traceId, remoteEntry);
    recordRemoteLoad({ traceId, remote, exposedModule, remoteEntry, startedAt, durationMs, outcome: 'failed', code: error.code, reason: String(reason) });
    log.warn('Remote failed to load', { traceId, remote, exposedModule, remoteEntry, code: error.code, hint: error.hint, reason: String(reason), durationMs });
    listeners.forEach((l) => l(error));
    throw error;
  }
}

const preloads = new Map<string, Promise<unknown>>();
/** Downloads a module without instantiating it (e.g. on hover). Failures are DEBUG only; the real load reports them. */
export function preloadRemoteModule(remote: RemoteName, exposedModule: string): Promise<unknown> {
  const key = `${remote}|${exposedModule}`;
  if (!preloads.has(key)) {
    const remoteEntry = getRemoteManifest()[remote];
    const attempt =
      remoteEntry && !simulateFailure(remote)
        ? loadRemoteModule({ remoteName: remote, remoteEntry, exposedModule }).then(
            () => log.debug('Remote preloaded', { remote, exposedModule }),
            (reason) => {
              preloads.delete(key);
              log.debug('Remote preload failed (reported on open)', { remote, exposedModule, code: classifyRemoteError(reason) });
            },
          )
        : Promise.resolve();
    preloads.set(key, attempt);
  }
  return preloads.get(key) as Promise<unknown>;
}

/** Domain remotes expose `./Routes` with a default export (or a named `routes`). */
export async function loadRemoteRoutes(remote: RemoteName, exposedModule = './Routes'): Promise<Routes> {
  const mod = await loadRemote<{ default?: Routes; routes?: Routes }>(remote, exposedModule);
  const routes = mod.default ?? mod.routes;
  if (!Array.isArray(routes)) {
    const error = new RemoteLoadError(remote, exposedModule, new Error('No Routes export'));
    log.warn('Remote failed to load', { remote, exposedModule, code: error.code, hint: error.hint });
    throw error;
  }
  return routes;
}

/** Capability remotes expose ONE standalone component (default export, or the first exported class). */
export async function loadCapability(remote: RemoteName, exposedModule: string): Promise<Type<unknown>> {
  const mod = await loadRemote<Record<string, unknown>>(remote, exposedModule);
  const component = (mod['default'] ?? Object.values(mod).find((v) => typeof v === 'function')) as Type<unknown> | undefined;
  if (!component) {
    const error = new RemoteLoadError(remote, exposedModule, new Error('No component export'));
    log.warn('Remote failed to load', { remote, exposedModule, code: error.code, hint: error.hint });
    throw error;
  }
  return component;
}
```
`mountLegacy` (for the isolated legacy remote) is added here too; its code is in **mfe-onboard-legacy-app** `references/code.md`.

### `src/lib/platform-diagnostics.ts`
```ts
/**
 * @file `platformDiagnostics()` console helper (ADR-0016): session, log level, manifest, load history, failures with hints,
 * slowest loads, setLogLevel. Free of secrets, so it is installed in every build.
 */
import { getLogLevel, sessionId, setLogLevel, type LogLevel } from '@platform/utils';
import { REMOTE_ERROR_HINTS, getRemoteLoadRecords } from './diagnostics';
import { getRemoteManifest } from './manifest';

export function platformDiagnostics(app: Record<string, unknown> = {}) {
  const loads = getRemoteLoadRecords();
  return {
    sessionId,
    logLevel: getLogLevel(),
    app,
    manifest: getRemoteManifest() as Record<string, string>,
    loads,
    failures: loads
      .filter((l) => l.outcome === 'failed')
      .map((l) => ({ ...l, hint: l.code ? REMOTE_ERROR_HINTS[l.code] : undefined })),
    slowest: [...loads].filter((l) => l.outcome === 'loaded').sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
    setLogLevel: (level: LogLevel) => setLogLevel(level),
  };
}

/** Called once by the shell (and by each remote's standalone harness). */
export function installPlatformDiagnostics(app: Record<string, unknown>): void {
  (globalThis as unknown as { platformDiagnostics: () => unknown }).platformDiagnostics = () => platformDiagnostics(app);
}
```

---

## libs/auth

### `src/index.ts`
```ts
/** @file Public API of @platform/auth. Mock auth is the separate, unshared @platform/auth-mock (ADR-0005). */
export * from './lib/auth.service';
export * from './lib/auth.guard';
export * from './lib/auth.interceptor';
export * from './lib/provide-auth';
export * from './lib/persona-switcher';
export * from './lib/okta/okta-auth.service';
```

### `src/lib/auth.service.ts`
```ts
/** @file Abstract AuthService: the only auth API MFEs see; the shell provides Okta or Mock (ADR-0011). */
import { Signal, computed } from '@angular/core';
import type { AuthUser } from '@platform/contracts';

export abstract class AuthService {
  abstract readonly user: Signal<AuthUser | null>;
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Restore a session or complete a redirect. Called once by the shell before routing. */
  abstract init(): Promise<void>;
  abstract login(returnUrl?: string): Promise<void>;
  abstract logout(): Promise<void>;
  /** Fresh access token (refreshing if needed), or null when signed out. */
  abstract getAccessToken(): Promise<string | null>;
}
```

### `src/lib/provide-auth.ts`
```ts
/** @file provideAuth(oktaConfig): registers real (Okta) auth; mock builds override it in start-mocks.ts (ADR-0011). */
import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { AuthService } from './auth.service';
import { OktaAuthService } from './okta/okta-auth.service';

export interface OktaConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
  scopes?: string[];
}

export const OKTA_CONFIG = new InjectionToken<OktaConfig>('OKTA_CONFIG');

/** Mock configurations add `provideMockAuth(...)` AFTER this, which overrides AuthService. */
export function provideAuth(config: OktaConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: OKTA_CONFIG, useValue: config },
    { provide: AuthService, useClass: OktaAuthService },
  ]);
}
```

### `src/lib/okta/okta-auth.service.ts`
```ts
/** @file Okta (OIDC + PKCE) implementation; SDK lazy-loaded so mock builds and remotes never download it (ADR-0011). */
import { Injectable, inject, signal } from '@angular/core';
import type { AuthUser } from '@platform/contracts';
import type { OktaAuth } from '@okta/okta-auth-js';
import { AuthService } from '../auth.service';
import { OKTA_CONFIG } from '../provide-auth';

@Injectable()
export class OktaAuthService extends AuthService {
  private readonly config = inject(OKTA_CONFIG);
  private readonly _user = signal<AuthUser | null>(null);
  private client?: OktaAuth;

  readonly user = this._user.asReadonly();

  private async sdk(): Promise<OktaAuth> {
    if (!this.client) {
      const { OktaAuth } = await import('@okta/okta-auth-js');
      this.client = new OktaAuth({
        issuer: this.config.issuer,
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        postLogoutRedirectUri: this.config.postLogoutRedirectUri,
        scopes: this.config.scopes ?? ['openid', 'profile', 'email', 'offline_access'],
        pkce: true,
        tokenManager: { autoRenew: true },
      });
      this.client.start(); // the shell's client is the ONLY one that renews
    }
    return this.client;
  }

  async init(): Promise<void> {
    const okta = await this.sdk();
    if (okta.isLoginRedirect()) await okta.handleLoginRedirect(); // restores the URI set by login()
    if (await okta.isAuthenticated()) {
      const claims = await okta.getUser();
      this._user.set({ userId: claims.sub, displayName: claims.name ?? claims.email ?? claims.sub, email: claims.email ?? '' });
    }
  }

  async login(returnUrl = '/'): Promise<void> {
    const okta = await this.sdk();
    okta.setOriginalUri(returnUrl);
    await okta.signInWithRedirect();
  }

  async logout(): Promise<void> {
    const okta = await this.sdk();
    this._user.set(null);
    await okta.signOut();
  }

  async getAccessToken(): Promise<string | null> {
    return (await this.sdk()).getAccessToken() ?? null;
  }
}
```

### `src/lib/auth.guard.ts`
```ts
/** @file authGuard: protects the shell's root route and starts sign-in when there is no session. */
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuthenticated()) return true;
  await auth.login(state.url);
  return false;
};
```

### `src/lib/auth.interceptor.ts`
```ts
/** @file Adds `Authorization: Bearer <token>` to same-origin /api calls only, never to remoteEntry or third-party URLs. */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api')) return next(req);
  const auth = inject(AuthService);
  return from(auth.getAccessToken()).pipe(
    switchMap((token) => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req)),
  );
};
```

### `src/lib/persona-switcher.ts`
```ts
/** @file PERSONA_SWITCHER: present only in mock builds; the shell header shows a persona picker when it exists. */
import { InjectionToken, Signal } from '@angular/core';
import type { Persona } from '@platform/contracts';

export interface PersonaSwitcher {
  readonly personas: readonly Persona[];
  readonly current: Signal<Persona>;
  switchTo(id: Persona['id']): void;
}

/** Inject with `{ optional: true }`. */
export const PERSONA_SWITCHER = new InjectionToken<PersonaSwitcher>('PERSONA_SWITCHER');
```

### `libs/auth/mock/src/index.ts` + `mock-auth.service.ts` (package `@platform/auth-mock`)
```ts
/** @file MockAuthService + provideMockAuth: always signed in as a persona, sent to the mock API as `Bearer mock.<id>` (ADR-0005). */
import { EnvironmentProviders, Injectable, InjectionToken, computed, inject, makeEnvironmentProviders, signal } from '@angular/core';
import type { AuthUser, Persona } from '@platform/contracts';
import { AuthService, PERSONA_SWITCHER, type PersonaSwitcher } from '@platform/auth';

export const MOCK_PERSONAS = new InjectionToken<readonly Persona[]>('MOCK_PERSONAS');
const STORAGE_KEY = 'platform.mockPersona';

export const mockTokenFor = (personaId: Persona['id']): string => `mock.${personaId}`;

@Injectable()
export class MockAuthService extends AuthService implements PersonaSwitcher {
  readonly personas = inject(MOCK_PERSONAS);
  private readonly _current = signal<Persona>(this.restore());
  readonly current = this._current.asReadonly();
  readonly user = computed<AuthUser | null>(() => {
    const { userId, displayName, email } = this._current();
    return { userId, displayName, email };
  });

  async init(): Promise<void> {}
  async login(): Promise<void> {}
  async logout(): Promise<void> { location.assign('/'); }
  async getAccessToken(): Promise<string> { return mockTokenFor(this._current().id); }

  switchTo(id: Persona['id']): void {
    const next = this.personas.find((p) => p.id === id);
    if (!next) return;
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage blocked */ }
    this._current.set(next);
  }

  private restore(): Persona {
    let saved: string | null = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch { /* ignore */ }
    return this.personas.find((p) => p.id === saved) ?? this.personas[0];
  }
}

/** Use ONLY from start-mocks.ts. */
export function provideMockAuth(personas: readonly Persona[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MOCK_PERSONAS, useValue: personas },
    MockAuthService,
    { provide: AuthService, useExisting: MockAuthService },
    { provide: PERSONA_SWITCHER, useExisting: MockAuthService },
  ]);
}
```
A persona switch must `location.reload()` so every guard, resolver and cached view re-evaluates.

---

## libs/entitlements

### `src/lib/entitlements.service.ts`
```ts
/** @file Entitlements (RBAC) + feature flags for the signed-in user; loaded once by the shell, read by every MFE (ADR-0015). */
import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { EntitlementsResponse } from '@platform/contracts';

export const ENTITLEMENTS_URL = '/api/me/entitlements';

@Injectable({ providedIn: 'root' })
export class EntitlementsService {
  private readonly http = inject(HttpClient);
  private readonly _entitlements = signal<ReadonlySet<string>>(new Set());
  private readonly _flags = signal<Readonly<Record<string, boolean>>>({});
  private readonly _loaded = signal(false);

  readonly entitlements = this._entitlements.asReadonly();
  readonly featureFlags = this._flags.asReadonly();
  readonly loaded = this._loaded.asReadonly();
  readonly count = computed(() => this._entitlements().size);

  async load(): Promise<void> {
    this.set(await firstValueFrom(this.http.get<EntitlementsResponse>(ENTITLEMENTS_URL)));
  }
  set(res: EntitlementsResponse): void {
    this._entitlements.set(new Set(res.entitlements));
    this._flags.set(res.featureFlags);
    this._loaded.set(true);
  }
  clear(): void {
    this._entitlements.set(new Set());
    this._flags.set({});
    this._loaded.set(false);
  }
  /** `undefined` means "no entitlement required". */
  has(entitlement: string | undefined): boolean {
    return !entitlement || this._entitlements().has(entitlement);
  }
  isEnabled(flag: string): boolean {
    return this._flags()[flag] === true;
  }
}
```

### `src/lib/entitlement.guard.ts`
```ts
/** @file entitlementGuard(name): sends users without the entitlement to /forbidden?need=<name>. */
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EntitlementsService } from './entitlements.service';

export function entitlementGuard(entitlement: string): CanActivateFn {
  return async () => {
    const service = inject(EntitlementsService);
    if (!service.loaded()) await service.load().catch(() => undefined);
    return service.has(entitlement)
      ? true
      : inject(Router).createUrlTree(['/forbidden'], { queryParams: { need: entitlement } });
  };
}
```

### `src/lib/has-entitlement.directive.ts`
```ts
/** @file *hasEntitlement: renders its template only when the user holds the entitlement (UI hint; the API enforces). */
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { EntitlementsService } from './entitlements.service';

@Directive({ selector: '[hasEntitlement]' })
export class HasEntitlementDirective {
  readonly hasEntitlement = input.required<string>();
  private readonly service = inject(EntitlementsService);
  private readonly template = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.service.has(this.hasEntitlement());
      if (allowed && !this.shown) this.vcr.createEmbeddedView(this.template);
      if (!allowed && this.shown) this.vcr.clear();
      this.shown = allowed;
    });
  }
}
```
Lint: this lib's ESLint config must allow the `has` attribute prefix besides its own.

---

## libs/utils

### `src/lib/log/platform-log.ts`
```ts
/**
 * @file Platform-wide structured logging (ADR-0016). One framework-agnostic logger per page (utils is a shared singleton):
 *   [platform] 14:05:01.123 INFO  federation     Remote loaded  { remote: 'mfe-x', durationMs: 84, traceId: 'mfe-7' }
 * Level: `?logLevel=debug` or localStorage['platform.logLevel']. Default info. warn/error go to one optional sink.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  source: string;
  message: string;
  context?: Record<string, unknown>;
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

/** Random id for this page load (not a user id); quote it in bug reports. */
export const sessionId: string =
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);

function initialLevel(): LogLevel {
  try {
    const fromUrl = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('logLevel') : null;
    if (fromUrl && fromUrl in ORDER) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl as LogLevel;
    }
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored && stored in ORDER) return stored as LogLevel;
  } catch { /* storage blocked */ }
  return 'info';
}

let threshold: LogLevel = initialLevel();
let sink: ((entry: LogEntry) => void) | null = null;

export function setLogLevel(level: LogLevel): void {
  threshold = level;
  try { localStorage.setItem(STORAGE_KEY, level); } catch { /* ignore */ }
}
export const getLogLevel = (): LogLevel => threshold;
export function setLogSink(fn: ((entry: LogEntry) => void) | null): void { sink = fn; }

function write(level: LogLevel, source: string, message: string, context?: Record<string, unknown>): void {
  if (ORDER[level] < ORDER[threshold]) return;
  const entry: LogEntry = { level, source, message, context, at: new Date().toISOString(), sessionId };
  const line = `[platform] ${entry.at.slice(11, 23)} ${level.toUpperCase().padEnd(5)} ${source.padEnd(14)} ${message}`;
  // The ONE allowed console call in the platform.
  console[level](line, ...(context ? [context] : []));
  if (sink && ORDER[level] >= ORDER.warn) {
    try { sink(entry); } catch { /* telemetry must never break the page */ }
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
```

### `src/lib/logger.service.ts`
```ts
/** @file Angular facade over the platform logger; wires the LOG_ENDPOINT sink once (ADR-0016). */
import { Injectable, InjectionToken, inject } from '@angular/core';
import { createLogger, setLogSink } from './log/platform-log';

/** e.g. '/api/telemetry/logs' from app-config.json. Unset = console only. */
export const LOG_ENDPOINT = new InjectionToken<string | null>('LOG_ENDPOINT', { factory: () => null });

@Injectable({ providedIn: 'root' })
export class LoggerService {
  constructor() {
    const endpoint = inject(LOG_ENDPOINT);
    if (endpoint) setLogSink((entry) => navigator.sendBeacon?.(endpoint, JSON.stringify(entry)));
  }
  debug(message: string, context?: Record<string, unknown>, source = 'app'): void { createLogger(source).debug(message, context); }
  info(message: string, context?: Record<string, unknown>, source = 'app'): void { createLogger(source).info(message, context); }
  warn(message: string, context?: Record<string, unknown>, source = 'app'): void { createLogger(source).warn(message, context); }
  error(message: string, context?: Record<string, unknown>, source = 'app'): void { createLogger(source).error(message, context); }
}
```

### `src/lib/correlation-id.interceptor.ts`
```ts
/** @file Tags every /api call with X-Correlation-Id so backend traces join UI logs (ADR-0016). */
import { HttpInterceptorFn } from '@angular/common/http';

export const CORRELATION_HEADER = 'X-Correlation-Id';
export const newCorrelationId = (): string => crypto.randomUUID();

export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api') || req.headers.has(CORRELATION_HEADER)) return next(req);
  return next(req.clone({ setHeaders: { [CORRELATION_HEADER]: newCorrelationId() } }));
};
```

### `src/lib/http-logging.interceptor.ts`
```ts
/**
 * @file Logs failed API calls with correlation id and duration. Statuses the caller declares normal
 * (`{ context: expectHttpErrors(404) }`) log at DEBUG. Never swallows or changes errors.
 */
import { HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
import { createLogger } from './log/platform-log';
import { CORRELATION_HEADER } from './correlation-id.interceptor';

const log = createLogger('http');
export const EXPECTED_HTTP_ERRORS = new HttpContextToken<readonly number[]>(() => []);
export const expectHttpErrors = (...statuses: number[]): HttpContext => new HttpContext().set(EXPECTED_HTTP_ERRORS, statuses);

export const httpLoggingInterceptor: HttpInterceptorFn = (req, next) => {
  const start = performance.now();
  return next(req).pipe(
    tap({
      error: (err: unknown) => {
        if (!(err instanceof HttpErrorResponse)) return;
        const context = { correlationId: req.headers.get(CORRELATION_HEADER), durationMs: Math.round(performance.now() - start) };
        const message = `HTTP ${err.status} ${req.method} ${req.urlWithParams}`;
        if (req.context.get(EXPECTED_HTTP_ERRORS).includes(err.status)) log.debug(`${message} (expected)`, context);
        else log.warn(message, context);
      },
    }),
  );
};
```

### `src/index.ts`
```ts
/** @file Public API of @platform/utils (shared singleton: one logger, one level, one sink per page). */
export * from './lib/log/platform-log';
export * from './lib/logger.service';
export * from './lib/correlation-id.interceptor';
export * from './lib/http-logging.interceptor';
```

---

## libs/mocks (dev and CI only; never shared, never in production)

Copy MSW's worker once: `npx msw init libs/mocks/assets --save=false`. Builds copy it only in `development` and `mock` configurations.

### `src/lib/api-path.ts`
```ts
/** @file Origin-agnostic MSW path: matches /api/x on the shell origin, a remote's dev origin, and in Node tests. */
export const api = (path: `/${string}`): string => `*/api${path}`;
```

### `src/lib/mock-flags.ts`
```ts
/**
 * @file URL flags for mock sessions: ?mockDelay=800 · ?mockFail=<remote>[,<remote>] · ?mockFail=/api/<path> (500).
 */
const params = () => (typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search));

export function mockDelayMs(): number {
  const v = Number(params().get('mockDelay'));
  return Number.isFinite(v) && v > 0 ? Math.min(v, 30000) : 0;
}
export const mockFailures = (): string[] => (params().get('mockFail') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
export async function mockDelay(): Promise<void> {
  const ms = mockDelayMs();
  if (ms) await new Promise((r) => setTimeout(r, ms));
}
export const shouldFailRemote = (remote: string): boolean => mockFailures().includes(remote);
export const shouldFailApi = (path: string): boolean => mockFailures().some((f) => f.startsWith('/') && path.startsWith(f));
```

### `src/lib/http-errors.ts`
```ts
/** @file Response helpers for mock handlers, plus the persona entitlement check (mocks answer 403 like the API, ADR-0015). */
import { HttpResponse } from 'msw';
import type { Persona } from '@platform/contracts';

export const forbidden = (entitlement: string) => HttpResponse.json({ message: `Missing entitlement ${entitlement}` }, { status: 403 });
export const notFound = (what: string) => HttpResponse.json({ message: `${what} not found` }, { status: 404 });
export const simulatedFailure = () => HttpResponse.json({ message: 'Simulated failure (?mockFail)' }, { status: 500 });
export const has = (persona: Persona, entitlement: string) => persona.entitlements.includes(entitlement);
```

### `src/personas.ts`
```ts
/** @file Mock personas and their entitlements; the mock API reads the persona from `Bearer mock.<id>`. */
import type { Persona } from '@platform/contracts';

export const PERSONAS: readonly Persona[] = [
  { id: 'analyst', label: 'Analyst', userId: 'u-analyst-01', displayName: 'Ana Analyst', email: 'analyst@example.test',
    entitlements: ['<section>:view'] },
  { id: 'supervisor', label: 'Supervisor', userId: 'u-supervisor-01', displayName: 'Sam Supervisor', email: 'supervisor@example.test',
    entitlements: ['<section>:view', '<section>:approve'] },
  { id: 'auditor', label: 'Auditor', userId: 'u-auditor-01', displayName: 'Alex Auditor', email: 'auditor@example.test',
    entitlements: ['<section>:view', 'audit:view'] },
];

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {};

export function personaFromRequest(request: Request): Persona {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const id = token.startsWith('mock.') ? token.slice(5) : '';
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}
```
Use distinctive fixture ids (e.g. `REC-2026-000142`) and add them to `check-no-mocks-in-prod.mjs` so a fixture leaking into production fails CI.

### `src/handlers/identity.handlers.ts` and `src/handlers/index.ts`
```ts
/** @file Mock API: GET /api/me/entitlements for the persona in the bearer token. */
import { http, HttpResponse } from 'msw';
import type { EntitlementsResponse } from '@platform/contracts';
import { DEFAULT_FEATURE_FLAGS, personaFromRequest } from '../personas';
import { mockDelay } from '../lib/mock-flags';
import { api } from '../lib/api-path';

export const identityHandlers = [
  http.get(api('/me/entitlements'), async ({ request }) => {
    await mockDelay();
    const persona = personaFromRequest(request);
    return HttpResponse.json<EntitlementsResponse>({ entitlements: persona.entitlements, featureFlags: DEFAULT_FEATURE_FLAGS });
  }),
];
```
```ts
/** @file Every mock handler; each new handler file is registered here. */
import { identityHandlers } from './identity.handlers';
export const allHandlers = [...identityHandlers];
```

### `src/lib/browser.ts`
```ts
/** @file startMockWorker(): one MSW service worker per page; failures are logged and the app still boots. */
import { RequestHandler } from 'msw';
import { setupWorker } from 'msw/browser';
import { createLogger } from '@platform/utils';

const log = createLogger('mocks');

/** Call before bootstrap so the first request is mocked. Unhandled non-/api requests (remoteEntry, chunks) pass through. */
export async function startMockWorker(handlers: RequestHandler[]): Promise<boolean> {
  const worker = setupWorker(...handlers);
  try {
    await worker.start({
      onUnhandledRequest: (req, print) => {
        if (new URL(req.url).pathname.startsWith('/api')) print.warning();
      },
      serviceWorker: { url: '/mockServiceWorker.js' },
      quiet: true,
    });
  } catch (err) {
    log.error('MSW could not start: API calls will NOT be mocked', { reason: String(err) });
    return false;
  }
  log.info('MSW active: all /api calls are mocked', { handlers: handlers.length });
  return true;
}
```

### `src/index.ts` and `src/node.ts`
```ts
// @platform/mocks browser entry. Import ONLY from an app's start-mocks.ts or from specs (ADR-0005).
export * from './personas';
export * from './handlers';
export * from './lib/mock-flags';
export * from './lib/browser';
export * from './lib/api-path';
export * from './lib/http-errors';
```
```ts
// Node entry for Vitest specs of the mocks lib (run in the Node environment; jsdom lacks TransformStream).
import { setupServer } from 'msw/node';
import { allHandlers } from './handlers';
export const server = setupServer(...allHandlers);
```
Recipe for a new mocked API: contract type (additive) → typed fixture keyed by stable ids → handler `http.get(api('/path'), …)` with `mockDelay()`, `shouldFailApi()`, persona check → register in `allHandlers` → Node spec with `onUnhandledRequest: 'error'`.

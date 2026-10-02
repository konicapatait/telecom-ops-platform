// @ts-check
/**
 * THE ONLY federation shared block in the workspace (ADR-0008).
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
  '@angular/aria': singleton,
  rxjs: singleton,
  tslib: singleton,
  // External design system: build-time npm package, runtime singleton, NEVER a remote (ADR-0001).
  '@org/design-system': singleton,
});

/**
 * Monorepo libs (tsconfig path mappings) shared as singletons, so DI services like AuthService,
 * EntitlementsService, CaseEventBus and CaseContextStore are ONE instance across shell and remotes.
 * Not shared on purpose: @platform/mocks (dev only), layout libs (compiled into each family member, ADR-0003).
 */
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
  // Not used by the platform and they need @angular/animations, which is not installed.
  '@angular/platform-browser/animations',
  '@angular/platform-browser/animations/async',
  'msw',
  'msw/browser',
  'msw/node',
  '@okta/okta-auth-js',
];

/**
 * @param {{ name: string; exposes?: Record<string, string> }} options
 */
function withPlatformFederation({ name, exposes = {} }) {
  return withNativeFederation({
    name,
    exposes,
    shared: sharedDeps,
    sharedMappings,
    skip,
    // MUST stay false (ADR-0018). With `true`, the host omits secondaries it doesn't import itself
    // (e.g. @angular/core/rxjs-interop); a remote then supplies its own build, whose internal chunks carry a
    // second copy of core state, and rxResource/toSignal fail with NG0203 at runtime.
    features: { ignoreUnusedDeps: false },
  });
}

module.exports = { sharedDeps, sharedMappings, skip, withPlatformFederation };

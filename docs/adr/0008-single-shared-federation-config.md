# ADR-0008: One shared federation config for the whole workspace, enforced by a drift check

- **Status:** Accepted (amended by [ADR-0018](0018-host-shares-all-angular-secondaries.md): `ignoreUnusedDeps` is now `false`)
- **Date:** 2026-10-02

## Decision
`libs/mf-manifest/src/shared.config.js` is the **only** place that declares:
- **Shared npm singletons:** `@angular/core`, `common`, `router`, `forms`, `platform-browser`, `cdk`, `aria`, `rxjs`, `tslib` and `@org/design-system`, all `singleton + strictVersion`. The plan listed core, common, router, aria, rxjs, design-system and contracts. `forms`, `platform-browser`, `cdk` and `tslib` were added because any Angular runtime package left unshared loads twice and breaks DI.
- **Shared monorepo libs (`sharedMappings`):** `@platform/contracts`, `mf-manifest`, `auth`, `entitlements`, `utils`. This makes `AuthService`, `EntitlementsService`, `CaseEventBus`, `CaseContextStore` and `LoggerService` **one instance per page**. The generated home page and the E2E test prove it ("Signed in as … · N entitlements" rendered by a remote).
- **Not shared:** `@platform/mocks` and `@platform/auth-mock` (dev only, ADR-0006), and the layout libs (compiled in, ADR-0003).
- **Skip list:** test entry points, `msw*`, and `@okta/okta-auth-js` (the shell lazy-loads it).

Every `apps/*/federation.config.js` is two lines: `withPlatformFederation({ name, exposes })`.

**Enforcement:** `npm run check:shared-config` (CI `workspace:checks`) fails when any app declares `shared`, `share(`, `shareAll(`, `sharedMappings`, `skip` or `withNativeFederation(`. It also fails when an app's federation name differs from its project name, when a shared package is not pinned exactly, or when a shared mapping has no tsconfig path.

## Consequences and gotchas found while building
- A **sub-path of a shared mapping** (for example `@platform/auth/mock`) is externalised by Native Federation but never added to the import map, and fails at runtime with "Unable to resolve specifier". Unshared entry points must use a **non-prefix** name (`@platform/auth-mock`).
- Shared mappings are bundled whole, with no tree-shaking across the boundary. Keep shared libs small and free of dev-only code.

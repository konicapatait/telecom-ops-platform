---
name: mfe-onboard-legacy-app
description: Convert an existing Angular 17+ (esbuild) application into an ISOLATED micro-frontend remote that keeps its own Angular version, design library, routes and role logic, mounted by a new shell under a base path with the shell's Okta session. Covers the spike, federation build target, mount entry, router bridge, auth/token bridge, entitlement-to-role mapping, CSS and overlay isolation, assets, zone.js, CI deploy to S3, strangler redirects and the phase gate. Use when onboarding any existing Angular app as a remote, or when debugging the legacy remote inside the shell.
---

# Onboard the existing app as an isolated remote

Pattern: the shell (Angular N, zoneless) loads the legacy app's `./Mount` module through Native Federation. The legacy bundle carries its **own** Angular, zone.js and old design library, shares nothing, and talks to the shell only through a framework-free contract (`LegacyMountContext` / `LegacyMountHandle`). The legacy app keeps running standalone from its old `main.ts`.

Self-contained: code for every step is in `references/code.md`, the spike list in `references/spike-checklist.md`. Shell-side APIs it relies on (`loadRemote`, `AuthService`, `EntitlementsService`, logger, runtime config) are in **mfe-shell-setup**. Decision: ADR-0018 of the seed register (**mfe-platform-blueprint** `references/decisions.md`). Placeholders: `<legacy>` = route segment and short name (e.g. `legacy`, or the app's name), remote name `mfe-<legacy>`.

## Before you start (must know)
Read `docs/migration/legacy-inventory.md` and `docs/migration/project-profile.md` in the shell repo (run the blueprint intake if missing). The answers below should already be there with file citations; read the legacy code for any that are not. Use the profile's `legacy.remote` and `legacy.route` for `<legacy>`. Never change legacy business code: the adapter only.
- Angular version and builder: must be `@angular/build:application` or `@angular-devkit/build-angular:application` (esbuild). If it is still `browser` (webpack), migrate the builder first (`ng update` migration), that is a prerequisite, not part of this recipe.
- NgModule or standalone bootstrap; zone.js in polyfills; `HashLocationStrategy`?; Angular service worker registered?
- How it authenticates (`@okta/okta-angular` + `OKTA_AUTH`? own interceptor? token storage?), its Okta client id.
- Its API base URL and where roles come from.
- Global styles in `angular.json` (old design library CSS, `styles.scss`), libraries that append to `body` (CDK overlay / Material, PrimeNG, ngx-bootstrap).
- Its 10 most-used screens (the spike list).

## Step 1. Spike (time-boxed, before any feature work)
Run steps 2–5 on a branch and check every item in `references/spike-checklist.md`. The top risks: the shell's Native Federation runtime loading a remoteEntry built by an older NF major; zone.js next to a zoneless shell; global CSS leaking both ways; overlays rendering outside the mount; routing (back/forward, deep links); Okta session reuse. Record the result as an amendment to ADR-0018 in the shell repo's decision register.

## Step 2. Federation build target (legacy repo)
- `npm i -D -E @angular-architects/native-federation@<same major as the legacy Angular>`.
- Add `federation.config.js` that exposes `./Mount` and shares **nothing** (`shared: {}`, `sharedMappings: []`). Check after build that `remoteEntry.json` has `"shared": []`.
- Add a `federation` target that wraps the existing esbuild target. Keep the existing `build`/`serve` targets and `main.ts` **unchanged** (if the NF init schematic rewrites `main.ts`, revert it).
- Federation build config: `outputHashing: "media"` (version folders are immutable, so file names can stay stable and the mount can find `styles.css`), `baseHref` irrelevant (the shell owns `<base>`), no service worker.

## Step 3. Mount entry (legacy repo)
`src/mount.ts` exports `mount(host, ctx): Promise<LegacyMountHandle>`:
1. Load zone.js once if absent (`if (!globalThis.Zone) await import('zone.js')`): the shell does not load it.
2. Compute `assetBase = new URL('./', import.meta.url).href` (the version folder) and inject `<link rel="stylesheet" href="${assetBase}styles.css" data-mfe="<legacy>">` once.
3. Create the root element inside `host` with a scope attribute (`data-mfe="<legacy>"`).
4. Bootstrap with `createApplication({ providers: [...appConfig.providers, ...platformAdapterProviders(ctx, host, assetBase)] })` then `appRef.bootstrap(AppComponent, rootEl)`. NgModule apps: `platformBrowser(extraProviders).bootstrapModule(MountModule)` with `ngDoBootstrap`.
5. Return `{ navigate(url), unmount() }`. `unmount` destroys the app (and platform for NgModule apps), removes the root element and the overlay container.

## Step 4. Platform adapter (legacy repo, `src/app/platform-adapter/`)
Provided **only** in mounted mode, so standalone behaviour is unchanged.
| Concern | Adapter | Minimal-change rule |
| --- | --- | --- |
| Base path | `APP_BASE_HREF = ctx.basePath` (`/<legacy>/`) | Legacy routes stay as they are; URLs become `/<legacy>/…` |
| Router sync | On legacy `NavigationEnd` → `ctx.onNavigated(fullUrl)`; `handle.navigate(url)` → `router.navigateByUrl(stripBase(url), { replaceUrl: true })` when different (loop guard both sides) | Back/forward work natively: both routers handle `popstate` |
| Leaving the app / strangled screens | A `canMatch` route prepended at mount: if `ctx.shellOwned(url)` returns a target, call `ctx.navigate(target)` and refuse the match; the legacy `**` route in mounted mode → `ctx.navigate('/not-found')` | Old links inside legacy code keep working and land on the new screens |
| Sign-in | Never redirect to Okta in mounted mode. 401 → `ctx.auth.login(location.pathname + location.search)` | The shell owns `/login/callback`; the legacy callback route remains for standalone only |
| Tokens (Phase 2a, zero code) | Provide `OKTA_AUTH` as an `OktaAuth` with the **shell's** issuer/clientId, `tokenManager.autoRenew: false`, `start()` NOT called: it reads the tokens the shell stores (same origin, same client) | Requires the shell to use the same Okta client and default `localStorage` token storage; spike the okta-auth-js version gap |
| Tokens (Phase 2b, end state) | Legacy interceptor/guard read `ctx.auth.getAccessToken()` / `ctx.auth.isAuthenticated()`; Okta SDK removed from the mounted path | One renewing client per tab, no rotation races |
| Roles | If legacy loads roles from the backend, keep it. If roles must come from the shell, override the legacy role service with one built from `ctx.entitlements` + a mapping table | One backend-owned entitlement list; mapping lives in the adapter |
| Config | Override the legacy environment/config token: `apiBase: '/api'` (same CloudFront domain) | No CORS; the shell's correlation id via `ctx.correlationId()` header if wanted |
| Overlays | Custom CDK `OverlayContainer` that creates its container inside the scoped root; library `appendTo` settings pointed at the root | Dialogs, menus and toasts stay styled and are removed on unmount |
| Assets | `ASSET_BASE` token = `assetBase`; images/i18n loaders use it (an `asset` pipe for templates) | Relative `assets/...` would resolve against the shell's origin root and 404 |
| Logging | Forward warn/error to `ctx.log(level, msg, context)` | One trace across shell and legacy |

## Step 5. CSS isolation
- Scope the legacy **global** CSS (old design library + `styles.scss`) under `[data-mfe="<legacy>"]` at build time (PostCSS prefix plugin or Sass wrapping); rewrite `html`/`body`/`:root` selectors to the scope. Component styles are already emulated-encapsulated.
- The shell's reset and `--ds-*` tokens still reach legacy DOM: re-establish the legacy baseline inside the scope; verify with visual regression on the spike screens.
- Shadow DOM is the alternative only if prefixing fails: Angular injects component styles into `document.head`, so Shadow DOM needs extra work. Decide in the spike.
- Shell side: no global selector in the shell may target arbitrary elements beyond its reset; remotes ship no global CSS.

## Step 6. Shell side (shell repo)
1. Contract: `libs/legacy-bridge` (types only, no Angular import) with `LegacyMountContext`, `LegacyMountHandle`, `LegacyMountFn`. Publish to the GitLab npm registry; the legacy repo depends on the exact version. Additive only.
2. Add `mfe-<legacy>` to `REMOTE_NAMES`, the local manifest (`http://localhost:<legacy-port>/remoteEntry.json`) and CODEOWNERS (by hand, documented as the one exception to the generator, or add `--kind=legacy` to the generator: preferred).
3. `mountLegacy(remote, host, ctx)` in `libs/mf-manifest` built on `loadRemote(remote, './Mount')` so loads are traced.
4. `LegacyHostComponent` (shell, `app/legacy/`): mounts on init, syncs URL both ways with loop guards, unmounts on destroy, shows an in-place "unavailable" state with Retry on load failure.
5. Route `{ path: '<legacy>', canActivate: [entitlementGuard('<legacy>:view')], children: [{ path: '**', component: LegacyHostComponent }] }` and nav entries for its main screens. Strangler redirects (`/<legacy>/cases/:id` → new remote) go **before** it as guard-based redirects keeping path + query, and are also returned by `ctx.shellOwned`.
6. CSP: allow nothing new (same origin). Performance: lazy only on `/<legacy>/**`; optional preload on nav hover via `preloadRemoteModule`.

## Step 7. CI/CD (legacy repo, GitLab)
`include:` `platform-shell/ci/templates/remote-deploy.gitlab-ci.yml`. Jobs: existing lint/test → `nx run <legacy>:federation` (or `ng run <legacy>:federation`) → upload `dist/<legacy>/browser` to `s3://<bucket>/mfe/mfe-<legacy>/<sha>/` (immutable) → smoke `remoteEntry.json` (name, exposes `./Mount`, `shared` empty) → conditional manifest write of `mfe-<legacy>` → manual staging/prod → manual rollback. Uses its own OIDC role limited to `mfe/mfe-<legacy>/*`. Details in **mfe-aws-hosting**.

## Step 8. Phase gate (E2E in `shell-e2e`, on mocks and on dev)
- `/<legacy>/<deep-link>?q=1` loads after sign-in, with no second Okta prompt.
- Back/forward across shell ⇄ legacy ⇄ new remote keep the right screen; reload on a legacy URL works.
- Legacy API calls carry the shell's token; a 401 sends the user through the shell's sign-in and back.
- A user without `<legacy>:view` sees no nav entry; the API still answers 403.
- Visual regression: spike screens unchanged inside the shell; shell chrome unchanged on legacy pages.
- Legacy remote removed from the manifest → only its section shows "unavailable"; Retry recovers.
- A strangled legacy URL (typed or clicked inside legacy) lands on the new remote.
- Unmount leaves no overlay container, stylesheet duplicates or event listeners (navigate away and back 10× and check heap/DOM).

## Afterwards (strangler)
Each new slice: build the new remote (**mfe-add-remote**) → add the redirect in the shell and to `shellOwned` → ship → remove the legacy screen when access logs show no hits. Optional later phase: upgrade legacy to the shell's Angular and switch it to a shared remote (`withPlatformFederation`), which removes the second runtime.

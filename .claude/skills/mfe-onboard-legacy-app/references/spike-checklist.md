# Legacy onboarding spike checklist

Run on the 10 most-used legacy screens, composed in the shell on the dev environment (real Okta, real S3/CloudFront if available). Record pass/fail and the fix for each; the outcome becomes an ADR in the shell repo.

## Loading
- [ ] Shell's Native Federation runtime loads the legacy `remoteEntry.json` built by the legacy NF major (format compatible). Fallback if not: expose `mount.js` as a plain ES module and `import()` it via es-module-shims, keeping the manifest entry.
- [ ] `remoteEntry.json` has `"shared": []`; no bare `@angular/*` specifiers left in the legacy chunks.
- [ ] `import.meta.url` inside the mount resolves to the version folder (also under es-module-shims).
- [ ] Lazy legacy routes (dynamic `import()`) load from the version folder.
- [ ] First legacy screen within the agreed performance budget (two Angular runtimes); later screens cached.

## Runtime coexistence
- [ ] zone.js loaded once; the zoneless shell keeps working after zone.js patches globals (shell nav, signals, HTTP).
- [ ] No conflicting globals (`window.*` set by legacy libs, polyfills, `ng` debug helpers).
- [ ] Legacy Angular service worker NOT registered in mounted mode.
- [ ] Legacy does not use `HashLocationStrategy` (or the router bridge is adapted to it).
- [ ] Legacy title strategy / `document.title` acceptable next to the shell's.
- [ ] `document.body` class or style changes (e.g. `modal-open`, scroll lock) are reverted on unmount.

## Routing
- [ ] Deep link reload on `/<legacy>/…` works (CloudFront Function rewrite → shell → mount → legacy router).
- [ ] Shell nav into a legacy sub-route while already mounted: legacy follows (handle.navigate).
- [ ] Legacy routerLink: shell router state follows (onNavigated), no loop, one history entry per click.
- [ ] Back/forward across shell ⇄ legacy ⇄ new remote.
- [ ] Legacy redirects to `/` or `**` routes don't escape the base path.
- [ ] Strangled URL inside legacy hands over to the shell.

## Auth and access
- [ ] No second sign-in; legacy API calls carry the shell's token.
- [ ] Token expiry: shell renews, legacy keeps working; no refresh-token rotation errors with two tabs open.
- [ ] 401 → shell sign-in → back to the same legacy URL.
- [ ] Roles: legacy role checks behave as before for each test persona; mapping table reviewed with the business.
- [ ] Sign-out from the shell signs the legacy view out.

## Styling and DOM
- [ ] Legacy global CSS prefixed; shell chrome visually unchanged on legacy pages (visual regression).
- [ ] Legacy screens visually unchanged inside the shell vs standalone (visual regression).
- [ ] Dialogs, menus, datepickers, tooltips, toasts render inside the scope and are styled.
- [ ] Fonts and icons load (relative `url()` from `styles.css`, icon sprites via `ASSET_BASE`).
- [ ] i18n / JSON assets load via `ASSET_BASE`.

## Lifecycle
- [ ] Navigate away and back 10×: one stylesheet link, no orphan overlay containers, no growing listeners/heap.
- [ ] Legacy remote missing from manifest → section fallback; Retry mounts after restore.
- [ ] Legacy error inside a screen does not crash the shell (legacy `ErrorHandler` contained, forwarded to `ctx.log`).

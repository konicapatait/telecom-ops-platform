# Lessons learned (portable)

Problems that already cost real time on a platform built exactly this way. Apply the prevention up front; check here first when debugging.

## Toolchain
| Symptom | Cause | Prevention |
| --- | --- | --- |
| `Cannot read properties of null (reading 'edgesOut')` on install | npm 10.9 bug with Vitest 4 optional peers | npm 11 |
| Angular CLI refuses to run | Node below the Angular minimum | Pin Node in `.nvmrc` + `engines` (Node 22 for Angular 21) |
| Packages install but don't work | npm 11 blocks install scripts | List approved ones in `package.json` → `allowScripts` |
| "Waiting for … in another nx process" | Stale Nx daemon | Kill Nx processes, `npx nx reset` |
| Continuous `serve` target cached | `targetDefaults` keyed by executor | Key target defaults by target name |
| Runtime failure after a "harmless" bump | Caret ranges across apps | Exact pins for every shared package; Angular + Native Federation + Nx upgrade together via `nx migrate` |

## Federation and shared code
| Symptom | Cause | Prevention |
| --- | --- | --- |
| `Unable to resolve specifier '@x/auth/mock'` | Sub-path of a shared mapping externalised but not in the import map | Unshared entry points get a non-prefix name (`@platform/auth-mock`) |
| Mock code in production bundles | Shared libs are bundled whole | Dev-only code never in a shared lib; separate unshared packages; scan prod bundles in CI |
| NG0203 (`inject() must be called from an injection context`) only when composed | Host did not share a secondary entry (`@angular/core/rxjs-interop`), remote brought its own copy | `features: { ignoreUnusedDeps: false }` in the shared config |
| Mock build overwrote the production build | Same output path | Separate output dirs (`dist/apps` vs `dist/apps-mock`) |
| Shell can't import anything in `main.ts` | Runs before the import map exists | `main.ts` imports only the federation runtime; everything else after `initFederation` in `bootstrap.ts` |
| A remote down at boot never recovers | Not registered in import map | Always pass `remoteEntry` to `loadRemoteModule`, so Retry registers it |

## Angular and routing
| Symptom | Cause | Prevention |
| --- | --- | --- |
| Retry does not reload a failed remote | Router caches the failed `loadChildren` | Rebuild routes with `router.resetConfig(factory())`, or a `canMatch` guard |
| Old URL redirect drops `/123?tab=x` | Prefix `redirectTo` drops the remainder | Guard-based redirects that keep path + query (strangler redirects need this) |
| Kept-alive tabs destroyed on switch | `linkedSignal` computation tracked another signal | `untracked` inside the computation |
| KPI disagrees with list below | Counted from a different source | Derive both from the same computed signal |

## Tests
| Symptom | Cause | Prevention |
| --- | --- | --- |
| Unit tests green, build red | Vitest does not type-check | Always run the build too |
| `page.route` misses outages | MSW's service worker re-issues requests | Use `context.route` in Playwright |
| E2E races lazy remotes | `goto` straight to a deep page | Navigate in-app and assert each step |
| Flaky first E2E after starting all servers | Not every port up | Wait for every port first |
| MSW handlers don't match in Node | Relative paths | Origin-agnostic patterns `*/api/...` |

## Hosting and release
| Risk | Prevention |
| --- | --- |
| Users run a stale mix of versions after a release | `index.html`, `mf-manifest.json`, `app-config.json` served with caching disabled; version folders immutable |
| A missing JS chunk becomes an HTML page | Never use CloudFront custom error pages for 403/404 → `index.html`; use a CloudFront Function that rewrites only extension-less paths |
| Two pipelines overwrite each other's manifest change | Serialise manifest writes (GitLab `resource_group` inside one repo; S3 conditional write `If-Match` ETag across repos) |
| Contract change breaks a deployed remote | Additive contracts + post-deploy contract smoke (exposes + shared versions) |
| CORS and cookie problems between remotes | One domain per environment; `/api` behind the same distribution |

## Legacy app inside a new shell
| Risk | Prevention |
| --- | --- |
| Old design library's global CSS leaks into the shell (or back) | Scope legacy global CSS under the mount element (prefix) or Shadow DOM; visual regression on key screens |
| Legacy code assumes it owns `window`, `body` or `/` | Base path, overlay container on the mount element, spike the top 10 screens |
| Two Angular runtimes → slow first legacy screen | Load the legacy remote lazily, only on a legacy route; performance budget |
| Users asked to sign in twice | Shell is the only Okta client that redirects; legacy reads the token from the shell |
| Role names differ between old and new | One backend-owned entitlement list; adapter maps entitlements to legacy roles |
| Process: scripted bulk edits silently missed | Exact edits, then grep to confirm |

# Gotchas already hit (and fixed)

| Symptom | Root cause | Fix in place |
| --- | --- | --- |
| `npm error Cannot read properties of null (reading 'edgesOut')` | npm 10.9 bug with Vitest 4 optional peers | npm 11 (ADR-0010) |
| Angular CLI refuses to run | Node 20.18 < 20.19 | Node 22 (`.nvmrc`) |
| npm warns about install scripts | npm 11 gates them | approved list in `package.json` → `allowScripts` (`npm install-scripts approve <pkg>`) |
| `Unable to resolve specifier '@platform/auth/mock'` at runtime | Native Federation externalises sub-paths of a shared mapping but has no import-map entry | Unshared entry named `@platform/auth-mock` (not a prefix-extension) |
| `MockAuthService` found in the production bundle | Shared mappings are bundled whole, with no cross-federation tree-shaking | Moved to `@platform/auth-mock`; `check-no-mocks-in-prod.mjs` guards it |
| Fixture ids in a production capability bundle | Dev harness hard-coded fixtures | `DEV_FIXTURE_CASES` token provided only by `start-mocks.ts` |
| Shell `mock` build overwrote the production output | Same `outputPath` | `mock` configuration writes `dist/apps-mock/<app>`; `build.outputs` lists both |
| `"serve" has both cache and continuous` | `targetDefaults` keyed by executor also hit serve | `targetDefaults` keyed by target name `build` |
| MSW handlers match nothing in Vitest | relative paths need an origin in Node | `api('/x')` → `*/api/x`; mocks tests run in `environment: 'node'` |
| `TransformStream is not defined` | `msw/node` under jsdom | `libs/mocks` tests use the Node environment |
| Playwright `page.route` does not block a remote | MSW's service worker re-issues requests | use `context.route` |
| E2E race after `page.goto` | `goto` resolves before lazy remote loading | navigate in-app and assert the expected UI before changing routes |
| Built-in IDE browser pane shows a blank page in mock mode | No service-worker support there | Use Chrome; `startMockWorker` logs and continues |
| Retry after a remote outage never reloads it | Angular caches the failed `loadChildren` | `router.resetConfig(appRoutes())` via `ROUTES_FACTORY` |
| "Home" nav item always active | `routerLinkActive` prefix match on `/` | fixed in DS 0.1.1 (`exact` for `/`) |
| `NG0203: rxResource() can only be used within an injection context` only when composed | Host didn't share `@angular/core/rxjs-interop` (`ignoreUnusedDeps: true`), so the remote's copy brought its own core chunks | `ignoreUnusedDeps: false` + skip list (ADR-0018). Never turn it back on. |
| Kept-alive tabs destroyed on every tab switch | `linkedSignal` computation read `selected()`, so it recomputed on selection | wrap the computation in `untracked` (ADR-0017 §4); covered by `case-view.component.spec.ts` |
| `WritableStream is not defined` in jsdom specs | spec imported the `@platform/mocks` barrel (pulls `msw/browser`) | specs import data from `@platform/mocks/fixtures` |
| `fixture.whenStable()` hangs in a resource spec | a pending `HttpTestingController` request keeps the app unstable | `TestBed.tick()` → `expectOne(...).flush()` → then `await whenStable()` |
| Clicking a `ds-tabs` tab does nothing in jsdom | `@angular/aria` tabs select on `pointerdown` | dispatch `new MouseEvent('pointerdown', { bubbles: true })` |
| Playwright strict-mode violations on tab content | labels repeat (e.g. "Download <file>" vs the file cell) | use `{ exact: true }` or scope to `cw-capability-tab-host[data-remote=…]` |
| Unit tests green but the build fails with TS errors | Vitest transpiles without type-checking | always run `nx run-many -t build` before calling a change done |
| A text-replace edit silently did nothing | Prettier had reformatted the code (multi-line objects/imports) | re-read the file before editing; verify with grep or the build |
| First E2E test flakes on a cold `start:all` | 12+ dev servers compile on first request | `expect.timeout` 10 s in `playwright.config.ts`; CI runs against built output |
| A nav link can't be clicked at some coordinates ("ds-nav-list intercepts pointer events") | Inline custom-element host wrapping block content | DS 0.2.0: `:host { display: block }` on `ds-nav-list` / `ds-tabs`. Give every DS host that wraps blocks a block display. |
| `/fraud/cases/X?tab=audit` redirected to `/case-management/fraud` (case and query lost) | Prefix `redirectTo` drops unmatched segments | `legacyRedirect` guard rewrites the whole URL |
| All E2E fail right after `start:all` from cold | Playwright waits only for :4200 while 13 remotes still compile | wait for every `remoteEntry.json` (see verification.md) or run against a built deployment |
| Python/sed edit "succeeded" but changed nothing | the file had been reformatted by Prettier | prefer exact `Edit` on freshly read text; grep after editing |
| `open(p,'w').write(open(p).read())` emptied a file | opening for write truncates before the read | never do that; read into a variable first |
| Audit rows with the same timestamp shown in the wrong order | stable sort over the newest-first API list | reverse the API list, then sort ascending |
| `nx g … --family=360` fails: "'360' should be a 'string'" | the Nx CLI parses 360 as a number | schema accepts both; the generator normalises with `String()` |
| ESLint `no-regex-spaces` in a spec regex | literal double space | use `{2}` |
| Every E2E test fails on dev servers right after a `nx build` (deployed run passes) | Native Federation dev servers serve shared bundles from `dist/apps/<app>`; a build overwrites them while the servers run | don't build while `start:all` runs; restart `start:all` after building |
| `nx run-many -t serve` prints "Waiting for <app>:serve in another nx process" and some ports never come up | a previous `start:all` was killed but its executors still hold Nx task locks | `pkill -f "nx run-many"; pkill -f "nx/bin/run-executor"`, free the ports, `npx nx reset`, then start again |
| Playwright `getByLabel('Period')` finds 2 elements / none with `exact` | substring match hits "Totals for the period"; a `<select>` inside its `<label>` gets the selected option's text in its accessible name | `getByRole('combobox', { name: /^Period/ })` |
| Chart value labels unreadable where they cross the target line | label drawn over another mark | `paint-order: stroke` halo in the surface colour (`charts/chart.css`) |

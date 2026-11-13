---
name: mfe-shell-setup
description: Step-by-step creation of a NEW micro-frontend shell project (Nx + Angular + Native Federation) with complete code templates. It covers the workspace config and version pins, shared libs (contracts, mf-manifest with the shared federation config and traced remote loaders, auth with Okta OIDC/PKCE plus mock auth, entitlements, logger, MSW mocks), shell boot order, runtime config, route registry, per-section fallback with Retry, the remote generator, guard scripts, the GitLab CI pipeline and the Phase 1 E2E gate. Use when starting a shell repo, adding Okta to a shell, changing boot, auth, nav or fallback behaviour, or reproducing this architecture from scratch.
---

# Create the shell project

Self-contained: every file is in `references/`. Read **mfe-platform-blueprint** first for the target structure and rules. Placeholders: `<org>`, `<group>`, `<domain>`, `<design-tokens>`, `@org/design-system` (your design-system package). Rule ids `(ADR-00NN)` refer to the seed register in `mfe-platform-blueprint/references/decisions.md`.

| Reference | Contents |
| --- | --- |
| `references/workspace.md` | version set, `.nvmrc`, `.npmrc`, `package.json`, `nx.json`, `tsconfig.base.json`, ESLint boundaries, Angular lint, Vitest setup, shell `project.json`, CODEOWNERS |
| `references/libs.md` | full code of contracts, mf-manifest (`shared.config.js`, manifest, loaders, diagnostics), auth + auth-mock, entitlements, utils (logger, interceptors), mocks |
| `references/shell-app.md` | full code of the shell: `main.ts`, `bootstrap.ts`, runtime config, providers, routes, session initializer, registry, fallbacks, chrome, capability slot, pages |
| `references/okta.md` | Okta tenant requirements, runtime config, rules, checks |
| `references/generator.md` | the `@platform/tools:mfe` generator and all its templates |
| `references/guard-scripts.md` | `check-shared-config`, `check-no-mocks-in-prod`, `check-file-headers` |
| `references/ci-pipeline.md` | root `.gitlab-ci.yml`, base/app templates with GitLab OIDC, `generate-pipeline.mjs` |
| `references/e2e.md` | Playwright config and the Phase 1 gate spec |
| `../mfe-aws-hosting/references/deploy-scripts.md` | `deploy-app`, `rollback-app`, `contract-smoke`, storage provider |

## Before step 0. Read before acting
Read `docs/migration/project-profile.md` and `docs/migration/legacy-inventory.md` in the shell repo. If either is missing, run the intake in **mfe-platform-blueprint** `references/intake.md` first. Use the profile's names for every placeholder; if a needed value is missing, ask the user (batches of up to 4) and record the answer in the profile. The legacy app is the source of truth for behaviour; these skills are the source of truth for architecture.

## 0. Prerequisites
- Node 22 and npm 11 (see workspace.md for why), GitLab project, Okta admin contact, design-system package name and version.
- Take the npm scope, selector prefixes, product name, environments and domains from the project profile; replace `@platform/*` and every `<placeholder>` in the templates with them.
- Okta issuer/client and API origin come from the legacy inventory (reuse the legacy Okta client unless the profile says otherwise).

## 1. Workspace
```bash
npx create-nx-workspace@23.2.1 platform-shell --preset=apps --pm=npm --nxCloud=skip
cd platform-shell
# install the exact versions from references/workspace.md ("Known-good version set"), e.g.:
npm i -E @angular/core@21.2.25 @angular/common@21.2.25 @angular/router@21.2.25 @angular/forms@21.2.25 \
  @angular/platform-browser@21.2.25 @angular/compiler@21.2.25 rxjs@7.8.2 tslib@2.8.1 \
  @angular-architects/native-federation@21.2.6 es-module-shims@2.8.4 @okta/okta-auth-js@8.0.1 @org/design-system@<x.y.z>
npm i -D -E @nx/angular@23.2.1 @nx/eslint-plugin@23.2.1 @nx/vitest@23.2.1 @nx/playwright@23.2.1 @nx/devkit@23.2.1 \
  msw@2.15.0 vitest@4.1.11 @analogjs/vite-plugin-angular@2.6.3 @analogjs/vitest-angular@2.6.3 @playwright/test@1.63.0 ...
```
Then write `.nvmrc`, `.npmrc`, `nx.json`, `tsconfig.base.json`, `eslint.config.mjs`, `tools/eslint/angular.config.mjs`, `tools/vitest/*` from workspace.md. Fill `allowScripts` after the first install.

## 2. Shared libs
Generate each lib (libs.md table: name, import path, tags), then replace its sources with libs.md. Order: `utils` → `contracts` → `mf-manifest` → `auth` → `auth-mock` → `entitlements` → `mocks` (`npx msw init libs/mocks/assets --save=false`) → `legacy-bridge` (code in **mfe-onboard-legacy-app**). Add every path to `tsconfig.base.json`. Edit `shared.config.js` to match the packages you actually install.

## 3. Shell app
```bash
npx nx g @nx/angular:application apps/shell --bundler=esbuild --standalone --style=css --prefix=shell --e2eTestRunner=none --unitTestRunner=vitest
```
Replace its `project.json` targets with the ones in workspace.md (Native Federation `build`/`serve` wrapping `esbuild`/`serve-original`, three configurations, `fileReplacements`, the mock worker asset, local manifest and app-config copied in development). Write every file in shell-app.md. Create `apps/shell/config/{local,dev,staging,prod}/app-config.json` and `libs/mf-manifest/manifests/{local,dev,staging,prod}/mf-manifest.json` (`{}`).

Boot order is load-bearing:
1. `main.ts` fetches the manifest, runs `initFederation`, then `import('./bootstrap')`. It imports nothing shared, because the import map does not exist yet.
2. `bootstrap.ts`: `setRemoteManifest` → `loadRuntimeConfig` → `startMocks` (empty in prod) → `bootstrapApplication`.
3. `initSession` (app initializer): `auth.init()` completes the Okta redirect → `entitlements.load()` → shell listeners.

## 4. Okta in the shell
Follow `references/okta.md`: tenant requirements list for the Okta admin, per-environment `app-config.json`, `/login/callback` outside the chrome, `authGuard` on the chrome route, Bearer only on same-origin `/api`. The shell is the **only** code that redirects to Okta or renews tokens.

## 5. Generator
Create `tools/generators` from generator.md. Make sure the markers exist: `// <generator:remote-names>` in `libs/contracts/src/lib/remotes.ts`, `// <generator:shell-routes>` in `apps/shell/src/app/routing/remote-registry.ts`, and `.gitlab/CODEOWNERS`. Smoke it:
```bash
npx nx g @platform/tools:mfe hello --kind=domain --label="Hello" --owner=@<group>/platform-team --dry-run
```

## 6. Guard scripts and CI
`tools/scripts/*` from guard-scripts.md; `.gitlab-ci.yml`, `ci/templates/*`, `tools/ci/generate-pipeline.mjs`, `tools/ci/lib/args.mjs` from ci-pipeline.md; `tools/ci/{deploy-app,rollback-app,contract-smoke}.mjs` and `lib/storage.mjs` from **mfe-aws-hosting** `references/deploy-scripts.md`. Set the environment-scoped CI/CD variables listed in ci-pipeline.md.

## 7. E2E
`apps/shell-e2e` from e2e.md. Generate the first remote (`--kind=domain`), add its entitlement to the mock personas, fill the constants in `phase-1-shell.spec.ts`.

## 8. Verify (report what ran and the results)
```bash
npx nx run-many -t lint test
npm run check:shared-config && npm run check:headers
npx nx run-many -t build && npm run check:no-mocks
PW_CHANNEL=chrome npm run e2e
node tools/ci/deploy-app.mjs --app shell --env dev --version local1 --provider local   # dry-run deploy into dist/deploy/dev
```
Phase 0 gate: a generated remote is deployed by the real pipeline to dev and loads in the shell. Phase 1 gate (dev, real Okta): sign-in round-trip; a deep link `/x/y?z=1` survives sign-in; a remote removed from the manifest shows only its section as unavailable; Retry recovers without reload; `platformDiagnostics()` lists the failure with code and hint.

## Gotchas (see blueprint `references/lessons.md` for all)
- `Unable to resolve specifier '@platform/x/sub'`: an unshared sub-path of a shared mapping. Give it a non-prefix name.
- NG0203 only when composed: `ignoreUnusedDeps` was turned back on.
- Retry does nothing: routes were a constant; use the routes factory + `resetConfig`.
- Mock code in prod: something outside `start-mocks.ts` imported mocks, or dev-only code sits in a shared lib.
- "Waiting for … in another nx process": kill Nx processes, `npx nx reset`.

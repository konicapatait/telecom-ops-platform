---
name: mfe-platform-blueprint
description: Self-contained blueprint for building an Angular micro-frontend platform with Nx + Native Federation, or migrating an existing Angular app to one. It covers a separate shell project that owns Okta sign-in, remotes discovered from a runtime manifest, the existing app onboarded as an isolated remote, private S3 + CloudFront hosting, and GitLab CI with per-app deploy and rollback. Use when planning or reviewing such a platform, deciding repo and project structure, ordering migration phases, or answering "how do we move <app> to micro-frontends". It routes to mfe-shell-setup, mfe-add-remote, mfe-onboard-legacy-app and mfe-aws-hosting for the hands-on steps.
---

# Micro-frontend platform blueprint

This skill set is complete on its own: every rule, code template, script and checklist you need is inside these five skills. No other repository is required. Code is written for **Nx + Angular (standalone, zoneless, signals) + `@angular-architects/native-federation` + MSW + Vitest + Playwright + GitLab CI + AWS S3/CloudFront + Okta**. Templates use `@platform/*` and `<placeholders>`: replace them with the confirmed values in `docs/migration/project-profile.md`, never guess.

## Operating principles (every skill in this set follows them)
1. **The legacy application is the source of truth for behaviour.** Routes, screens, fields, validations, role rules, APIs, Okta settings and wording come from the legacy code; never invent them. If the code does not answer it, ask.
2. **These skills are the source of truth for architecture.** When a legacy pattern conflicts with a rule below, keep the legacy behaviour, implement it the architectural way, and record the decision.
3. **Ask before naming.** Anything that becomes a name (repos, scope, remotes, prefixes, routes, entitlements, events, environments, domains, AWS resources, teams): propose a default derived from the legacy app, ask the user, in batches of up to 4 questions.
4. **Ask once, record, reuse:** answers go to `docs/migration/project-profile.md`; read it before asking.
5. **Gates before progress;** report what ran. **Minimal change to the legacy app.**

Starting a new platform? Run the intake first: `references/intake.md` (legacy inventory → naming questionnaire → project profile → slice map).

| Skill | Use it for |
| --- | --- |
| **mfe-platform-blueprint** (this) | architecture, structure, phases, rules, seed decision register, lessons learned |
| **mfe-shell-setup** | creating the shell workspace: shared libs, Okta, boot order, registry, fallbacks, mocks, generator, guard scripts, CI pipeline, E2E gate |
| **mfe-add-remote** | adding a domain / capability / hub remote, in the monorepo or in another repo |
| **mfe-onboard-legacy-app** | turning an existing Angular 17+ app into an isolated remote (own Angular, shares nothing) |
| **mfe-aws-hosting** | S3 + CloudFront + WAF + IAM requirements, bucket layout, deploy / rollback scripts |

## The target in one picture

```
Browser ── https://app.<domain> ── CloudFront (one distribution per environment)
              │  /api/*                        → existing backend (same origin: no CORS, Authorization forwarded)
              │  /mf-manifest.json, /app-config.json → S3, never cached
              │  /shell/<ver>/*, /mfe/<app>/<ver>/* → S3, immutable, cached 1 year
              └─ /* (deep links)               → CloudFront Function rewrites extension-less paths to /index.html
Shell (Angular N, zoneless)                     ← owns: Okta sign-in, header/nav, route registry, entitlements load,
  │                                                error boundaries, logger, cross-section navigation
  ├─ reads /mf-manifest.json at boot: { "<remote>": "<url>/remoteEntry.json" }
  ├─ new remotes (same Angular as shell; Angular, RxJS, design system, platform libs are shared singletons)
  │     domain remote  → exposes ./Routes, mounted at /<route>/**
  │     capability     → exposes ONE component with typed inputs, embedded by a host
  │     hub            → a domain remote whose pages host other domain remotes as tabs
  └─ legacy remote (existing app, Angular 17+, OWN Angular copy, shares nothing) → mounted at /<legacy>/**
        through a framework-free mount contract
```

Boot sequence of the shell: fetch `mf-manifest.json` → `initFederation(manifest)` → `import('./bootstrap')` → load `app-config.json` → start mocks (dev builds only) → `bootstrapApplication` → app initializer: `auth.init()` (Okta), then `entitlements.load()`.

## Decide first (read the legacy inventory and project profile; ask the user only for what they don't answer)
1. **Existing app:** Angular version and builder (must be esbuild `application` builder for the legacy recipe); NgModule or standalone; zone.js; how it signs in to Okta and stores tokens; API base URL; global CSS / old design library; route list; its 10 most-used screens.
2. **Okta:** tenant and authorization server; one SPA app integration for the shell (also reused by the legacy app in composed mode); where entitlements come from (token claims or an `/api/me/entitlements` endpoint, which is preferred).
3. **Design system:** package name, version, registry. It must be an npm package used by the shell and the new remotes. The legacy app keeps its old library.
4. **Environments:** names (dev / staging / prod), domains, AWS accounts, whether `/api` can sit behind the same CloudFront domain (strongly preferred).
5. **CI:** GitLab instance URL, group/project paths, protected branches and environments.
6. **First new slice:** one valuable screen with few dependencies.
7. **Ownership:** platform team for the shell and shared libs; one owning team per remote (CODEOWNERS).

Record each answer as a decision (see "Decision register").

## Repository topology

| Repo | Contents | Why |
| --- | --- | --- |
| `platform-shell` (new Nx monorepo) | shell, all new remotes, shared libs, generator, CI templates, deploy scripts, E2E | New remotes share runtime singletons (Angular, RxJS, design system, platform libs). One lockfile keeps them identical; Nx `affected` keeps builds independent. |
| `<legacy-app>` (existing repo) | the existing app + a thin platform adapter | Minimal change. It keeps its own Angular, design library and release cadence, and shares **nothing** at runtime except a framework-free mount contract. |
| design system (own repo) | npm package(s) | External, exact pin, never forked into the platform. |
| infrastructure (cloud team) | S3, CloudFront, WAF, IAM, DNS | Requirement list in **mfe-aws-hosting**. |

Same-framework remotes can live in other repos (**mfe-add-remote** §B), but then they must pin every shared singleton to exactly the shell's versions and release in lockstep with it. Prefer the monorepo.

## Project structure

### New shell project (`platform-shell`)
```
platform-shell/
├─ apps/
│  ├─ shell/                         host: chrome, Okta, routing, fallbacks, legacy host
│  │  ├─ config/<env>/app-config.json   runtime config per env (Okta issuer/clientId, log endpoint). No secrets.
│  │  ├─ public/                     favicon etc.
│  │  └─ src/
│  │     ├─ main.ts                  fetch manifest → initFederation → import('./bootstrap')  (imports nothing shared)
│  │     ├─ bootstrap.ts             runtime config → mocks (dev only) → bootstrapApplication
│  │     ├─ start-mocks.ts / start-mocks.prod.ts   ONLY place mocks are imported; swapped by fileReplacements
│  │     ├─ environments/            build-time flags only (mocks on/off), never env values
│  │     └─ app/{chrome,core,routing,pages,legacy}/
│  ├─ shell-e2e/                     Playwright; phase gates live here
│  └─ mfe-<domain>/ mfe-cap-<name>/  new remotes, created ONLY by the generator
├─ libs/
│  ├─ contracts/      types, REMOTE_NAMES/RemoteName, PlatformEventBus. Depends on nothing. Additive only.
│  ├─ mf-manifest/    src/shared.config.js (THE federation shared block), runtime manifest, loadRemote*/loadCapability,
│  │                  diagnostics; manifests/<env>/mf-manifest.json (local + seeds)
│  ├─ auth/           abstract AuthService, OktaAuthService, authGuard, authInterceptor, provideAuth
│  ├─ auth/mock/      MockAuthService (package name @platform/auth-mock: separate, NOT shared)
│  ├─ entitlements/   EntitlementsService, entitlementGuard, *hasEntitlement
│  ├─ utils/          createLogger/LoggerService, correlation-id + http-logging interceptors
│  ├─ mocks/          MSW handlers, typed fixtures, personas (dev/CI only, never shared)
│  ├─ legacy-bridge/  framework-free mount contract types (published for the legacy repo)
│  └─ <family>-layout/  optional build-time layout libs (compiled into members; NOT shared, NOT remotes)
├─ tools/
│  ├─ generators/     nx g @platform/tools:mfe … (the only way to add an app)
│  ├─ ci/             generate-pipeline, deploy-app, rollback-app, contract-smoke, lib/{args,storage}
│  ├─ scripts/        check-shared-config, check-no-mocks-in-prod, check-file-headers
│  ├─ eslint/         shared Angular lint rules (selector prefix, OnPush required)
│  └─ vitest/         shared Vitest config factory + zoneless TestBed setup
├─ ci/templates/      base, aws, app, remote-deploy (.gitlab-ci.yml); remote-deploy is included by other repos
├─ .gitlab-ci.yml  .gitlab/CODEOWNERS  .nvmrc  .npmrc
└─ docs/platform-handbook.md   decision register + lessons learned (seed: references/decisions.md)
```

### Existing app after onboarding (`<legacy-app>`)
```
<legacy-app>/
├─ federation.config.js         NEW: exposes { './Mount': './src/mount.ts' }, shares NOTHING
├─ angular.json                 NEW `federation` target + `federation` build configuration
├─ src/main.ts                  UNCHANGED (standalone run keeps working)
├─ src/mount.ts                 NEW: mount(host, ctx) → { navigate, unmount }
├─ src/mount-bootstrap.ts       NEW: createApplication + adapter providers
├─ src/app/platform-adapter/    NEW: base href, router sync, auth/token, roles, overlays, asset base, logging
├─ postcss config               global CSS prefixed under [data-mfe="<legacy>"] (federation build)
└─ .gitlab-ci.yml               + include of platform-shell ci/templates/remote-deploy.gitlab-ci.yml
```

## Migration phases (each closed by an automated gate)

| Phase | Work | Gate (must pass to close) |
| --- | --- | --- |
| 0. Foundations | Shell workspace with pins, shared config, contracts, auth (Okta + mock), entitlements, logger, mocks, generator, guard scripts, CI templates, deploy and rollback scripts. AWS dev environment provisioned. | A generated remote is deployed by the real pipeline to dev and loads in the shell. |
| 1. Shell live | Okta sign-in, chrome, nav from registry + entitlements, per-section fallback with Retry, runtime manifest. Optional stopgap: a CloudFront behaviour serves the old app's own build at `/<legacy>/*` (URL split, full reload) so users get one domain early. | Real Okta round-trip on dev; a deep link survives sign-in; a stopped remote breaks only its section; Retry recovers without reload. |
| 2. Legacy onboarded | Spike on the top 10 legacy screens, then the adapter: federation target, `mount.ts`, base path, auth bridge, CSS scoping, router sync. | Legacy deep links work under `/<legacy>/…`; one sign-in; no style leak either way (visual regression); legacy down ⇒ only its section shows the fallback. |
| 3. First new slice | First new remote via the generator; strangler redirect from the old screen. | The old URL lands on the new screen; contract smoke green. |
| 4+. Strangle | One legacy screen per slice → new remote + redirect; capability remotes where reuse appears. | Per-slice E2E; the legacy route list shrinks. |
| Last. Retire | Remove the legacy remote, its manifest entry, its routes and CSP/behaviour allowances. | No legacy traffic in access logs for one release. |

Write each phase's gate as an E2E spec **first** (`apps/shell-e2e/src/phase-N-<name>.spec.ts`); it fails until the phase is done.

## Rules (each is enforced by a script, lint rule, generator or review)
| # | Rule | Enforced by |
| --- | --- | --- |
| 1 | Shell owns the chrome only (header, nav, sign-in, error boundaries). Page layouts belong to remotes or build-time family layout libs. | review, lint tags |
| 2 | Remotes are discovered from a runtime `mf-manifest.json` per environment (`no-cache`). No remote URL is ever compiled into a build. | `main.ts`, deploy script |
| 3 | One failing remote breaks only its own section, tab or panel, with a Retry that needs no reload. | fallback components, E2E |
| 4 | One shared federation config (`withPlatformFederation`) for all same-framework apps; exact version pins; `ignoreUnusedDeps: false`. | `check-shared-config.mjs` |
| 5 | Remote code is loaded only through the platform loader (`loadRemote`, `loadRemoteRoutes`, `loadCapability`, `mountLegacy`), so every load is traced. | review, lint |
| 6 | Build once, promote: per-environment values live in runtime `app-config.json`; the staging artifact is byte-identical to production. | deploy script |
| 7 | Contracts lib depends on nothing; changes are additive only; event names carry a version (`.v1`, `.v2`). | lint tags, CODEOWNERS |
| 8 | Capability = one exposed standalone component with typed inputs (a named `…Inputs` contract); it fetches its own data and never reads the route. | generator, review |
| 9 | Remotes never navigate into another section and never import another app; they emit an event and the shell routes. | lint, review |
| 10 | Mocks can never reach production: one `start-mocks.ts` swapped by `fileReplacements`, ESLint import ban, mock auth in a separate unshared package, bundle scan. | ESLint, `check-no-mocks-in-prod.mjs` |
| 11 | Never put dev-only code in a shared lib: shared libs are bundled whole. | bundle scan |
| 12 | Apps are created only by the generator. | CODEOWNERS, review |
| 13 | The API enforces access (401/403); the UI hides and explains. Masking in the UI is not a control. | API, mocks answer 403 too |
| 14 | The design system is an external, exact-pinned package and a runtime singleton, never a remote and never forked. Only the shell loads global tokens/reset CSS; remotes ship no global CSS. | shared config, review |
| 15 | Every component is OnPush and zoneless-safe (signals). | ESLint |
| 16 | Log through the platform logger, never `console.*`; log context = correlation ids, never tokens or personal data. | review |
| 17 | Every source file starts with a `/** @file … */` header; comments explain why. | `check-file-headers.mjs` |
| 18 | The legacy remote shares nothing with the shell runtime and talks only through the mount contract. | contract smoke (`shared` empty) |
| 19 | Exact pins for Node, npm, Nx, Angular, Native Federation, and all shared packages; Angular + Native Federation + Nx upgrade together (`nx migrate`). | `engines`, check script |

## Decision register
Start `docs/platform-handbook.md` in the shell repo from `references/decisions.md`. It holds a seed register (ADR-0001…0020) matching the rules above, the entry format, and how to add or amend entries. Code comments cite decisions as `(ADR-00NN)`; the templates in these skills already cite the seed ids.

## Lessons learned
`references/lessons.md`: problems that already cost time (toolchain, federation, routing, tests, hosting, legacy) with the prevention for each. Read it before debugging.

## Where to go next
Create the shell → **mfe-shell-setup**. Add a remote → **mfe-add-remote**. Move the existing app → **mfe-onboard-legacy-app**. Hosting and deploy → **mfe-aws-hosting**.

# Intake: legacy inventory, naming questionnaire, project profile

Run this **before** writing any code in a new platform. Its outputs, kept in the shell repo, are read by every other skill:
- `docs/migration/legacy-inventory.md`: facts read from the legacy code.
- `docs/migration/project-profile.md`: names and settings confirmed by the user.
- `docs/migration/slice-map.md`: legacy modules → target remotes, approved by the user.

## Operating principles (apply in every skill)

1. **The legacy application is the source of truth for behaviour.** Routes, screens, fields, validations, role and permission rules, API endpoints and payloads, error handling, Okta settings and user-visible wording come from the legacy code. Never invent a business rule, entitlement name, API path or label. If the legacy code does not answer a question, ask the user.
2. **The skills are the source of truth for architecture.** Shell vs remote responsibilities, federation sharing, manifest, mocks firewall, CI/CD, hosting and the rules in the blueprint are not negotiable per slice. If a legacy pattern conflicts with an architecture rule (e.g. a module reaching into another module's state), keep the legacy *behaviour* and implement it the architectural way (contract, event, shell navigation). Record the conflict and the resolution in the decision register.
3. **Ask, don't assume, for anything that becomes a name.** Repo names, npm scope, app and remote names, selector prefixes, route segments, entitlement and event names, environment names, domains, AWS resource names, team handles. Propose a default derived from the legacy app and the conventions below, then ask for confirmation. Ask in small batches (≤ 4 questions), each self-contained.
4. **Ask once, record, reuse.** Every answer goes into `project-profile.md`. Before asking, read the profile. Ask again only when an answer is missing or contradicts the legacy code.
5. **Placeholders never reach committed code.** Replace every `<…>` and `@platform/*` in the templates with values from the profile. If a value is missing, stop and ask.
6. **Gates before progress.** Do not start a phase until the previous phase's gate passes. Report what ran and its results; never claim a gate that was not run.
7. **Minimal change to the legacy app.** Only the adapter described in **mfe-onboard-legacy-app**. Business code in the legacy repo stays untouched unless the user approves a change.

## Step 1: legacy inventory (read-only)

Ask the user for the legacy repo path if it is not in the workspace (Claude Code: start with `--add-dir <path-to-legacy>`). Then read, without changing anything:

| Area | Where to look | Record |
| --- | --- | --- |
| Toolchain | `package.json`, `angular.json` / `project.json`, `.nvmrc`, lockfile | Angular version, builder (`application` = esbuild ✓ / `browser` = webpack ✗), Node, test runner, NgModule vs standalone, zone.js |
| Routes | root routing module or `app.routes.ts`, every `loadChildren` / `loadComponent`, nested routes | full route tree with paths, lazy module, guards, resolvers, data/titles |
| Feature modules | `src/app/**` folders, NgModules, barrels | module list with purpose, size (files/LOC), inbound/outbound imports between modules |
| Access control | guards, role services, directives (`*ifRole`, `hasPermission`), `canActivate`/`canLoad`, menu filtering | role/permission names, where they come from (token claim, `/api/me`), which route/component/field each protects |
| Field-level rules | form builders, templates with role conditions, masking pipes | per screen: hide / mask / read-only rules by role |
| APIs | `HttpClient` services, interceptors, environment files | base URLs per environment, endpoint list per module, auth header logic, error handling, CORS assumptions |
| Auth | Okta SDK usage (`@okta/okta-angular`, `OktaAuth` config), callback route, token storage, logout | issuer, client id, redirect URIs, scopes, storage, renewal |
| UI foundation | global styles in build config, design library, theme, fonts, icons, CDK/Material/PrimeNG overlays, `document.body` changes | old design library + version, overlay libraries, global CSS files |
| Assets | `assets/`, i18n loaders, absolute asset URLs | asset types and how they are referenced |
| Runtime extras | service worker, analytics, third-party scripts, `window.*` globals, `HashLocationStrategy` | anything that assumes it owns the page |
| Shared components | `shared/` modules used by several features | candidates for capability remotes |
| Tests | unit and E2E suites, test ids | what can become parity tests |
| Usage | ask the user (analytics) | the 10 most-used screens, the first slice candidate |

Write `docs/migration/legacy-inventory.md`:
```md
# Legacy inventory: <legacy app name> @ <commit sha>, <date>
## Toolchain        Angular x.y · builder · Node · NgModule|standalone · zone.js yes|no · tests
## Route tree       | path | module/component | guards | roles | notes |
## Modules          | module | purpose | LOC | depends on | used by |
## Roles & rules    | role/permission | source | protects (route/component/field) |
## APIs             | module | method path | used by screen | notes |
## Auth             issuer · clientId · redirect URIs · scopes · storage · renewal
## UI foundation    design library + version · global CSS files · overlay libs · body/window assumptions
## Assets & runtime assets · i18n · service worker · third-party scripts
## Risks for onboarding   (map each to the spike checklist item)
## Open questions   (things the code does not answer → ask the user)
```
Every row cites the file it came from (`src/app/x/x.routes.ts:12`).

## Step 2: naming and settings questionnaire

Propose defaults (left column rule), ask the user to confirm or change. Batch the questions.

| # | Item | Default proposal | Used by |
| --- | --- | --- | --- |
| 1 | Product display name | legacy app's title | shell title, docs |
| 2 | Shell repo name | `<App-New-Name>` | everything |
| 3 | Legacy repo name/path | as is | legacy skill |
| 4 | npm scope for platform libs | `@<product>` (templates say `@platform`) | tsconfig paths, imports, packages |
| 5 | Remote naming | `mfe-<domain>`, capability `mfe-cap-<name>`, kebab-case | generator, manifest, S3 prefixes |
| 6 | Legacy remote name + route segment | `mfe-<legacy>` at `/<legacy>/` | legacy skill, CloudFront |
| 7 | Selector prefix per app | shell `shell`, remote = name without dashes | lint |
| 8 | Route segment style | kebab-case, nouns, same as legacy where a screen moves | registry, redirects |
| 9 | Entitlement naming | reuse legacy role/permission names if the backend owns them; else `<area>:<action>` (`orders:view`) | personas, guards, API |
| 10 | Event naming | `<area>.<thing>.<verb>.v1` | contracts |
| 11 | Environment names | `dev`, `staging`, `prod` (match existing) | config, CI, AWS |
| 12 | Domains per environment | ask | Okta, CloudFront, CSP |
| 13 | Design system package + version + registry | ask | shared config |
| 14 | Okta tenant, auth server, client (reuse legacy client?) | reuse the legacy client id | okta.md |
| 15 | Entitlement source | `/api/me/entitlements` if it exists, else token claims | entitlements lib |
| 16 | API origin | `/api` behind CloudFront (same origin) | interceptors, CloudFront |
| 17 | AWS accounts, region, resource naming | `<org>-<product>-web-<env>` buckets, `deploy-<app>-<env>` roles | infra requirements |
| 18 | GitLab instance, group, protected branches, tag format | `main`, `ci-vX.Y.Z` | CI templates |
| 19 | Teams and CODEOWNERS handles | ask | CODEOWNERS, generator `--owner` |
| 20 | Commit message / branch conventions | follow the legacy repo's | all |
| 21 | Node / Angular target versions for the shell | the known-good set in mfe-shell-setup | workspace |
| 22 | First slice | a valuable, low-dependency screen from the usage list | slice map |

## Step 3: project profile

`docs/migration/project-profile.md`, the single place for confirmed answers:
```md
# Project profile (confirmed values; agents read this before asking)
| Key | Value | Confirmed by / date |
| --- | --- | --- |
| product.name | … | |
| repo.shell | … | |
| repo.legacy | … | |
| npm.scope | @… | |
| naming.remote | mfe-<domain> / mfe-cap-<name> | |
| legacy.remote | mfe-… | |
| legacy.route | /…/ | |
| naming.selectorPrefix.shell | … | |
| naming.entitlement | … | |
| naming.event | … | |
| env.names | dev, staging, prod | |
| env.domains | dev=…, staging=…, prod=… | |
| ds.package | …@x.y.z (registry …) | |
| okta.issuer / okta.clientId(s) | … | |
| entitlements.source | … | |
| api.origin | … | |
| aws.accounts / region / naming | … | |
| gitlab.url / group / tagFormat | … | |
| teams | platform=@…, <domain>=@… | |
| versions | Node 22, Angular 21.2.25, … | |
```

## Step 4: slice map

`docs/migration/slice-map.md`: the agent proposes, the user approves.
```md
| Legacy module / screen | Legacy routes | Target | Kind | Remote name | New route | Entitlement | Order | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| orders | /orders/** | Phase 2: stays in legacy remote | – | mfe-legacy | /legacy/orders/** | (legacy role) | – | onboarded |
| orders list | /orders | new domain remote | domain | mfe-orders | /orders | orders:view | 1 | planned |
| notes (shared) | – (used by 3 screens) | capability | capability | mfe-cap-notes | – | notes:view | 2 | planned |
```
Rules for the proposal: one legacy feature module ≈ one domain remote; a shared component used by ≥ 2 features ≈ a capability; keep modules that always change together in one remote; the first slice has few inbound dependencies.

# Micro-frontends: a practical guide

Oct 2, 2026 · @Konica

## Who this is for

This guide is for developers joining a team that builds its web front end as micro-frontends (MFEs), especially those new to the pattern. Read it top to bottom once. Then keep the checklist and the integration rules open while you build your first MFE.

In short:

- **What it is.** One host application, the *shell*, loads separately built and deployed pieces of UI, the *remotes*, at runtime.
- **What you gain.** Teams ship independently.
- **What it costs.** Real complexity: shared dependencies, contracts, runtime failures and operations.
- **When to use it.** Only when several teams need to release on their own schedules.
- **How to do it right.** A thin shell, a small typed contract library, one shared-dependency config, a generator for new remotes, failure isolation around every remote, and logging that traces each load.

The examples use Angular with Native Federation in an Nx monorepo, but every rule applies to React, Vue or Webpack Module Federation as well.

## What micro-frontends are

A micro-frontend is a slice of the UI that one team owns end to end. It lives in its own build, deploy and release cycle, and it is composed into a single page at runtime. It is the front-end counterpart of microservices: the split follows business domains, not technical layers.

Four parts make up every MFE system:

| Part | What it is | Owns |
| --- | --- | --- |
| Shell (host) | The app the browser loads first | Chrome (header, nav, sign-in), routing to remotes, error boundaries, global services |
| Remote | A separately built bundle that exposes routes or components | One business domain or one reusable capability |
| Contract | A small shared library of types, tokens and events | The only API between shell and remotes |
| Manifest | A runtime map from remote name to URL | Which version of each remote a given environment loads |

The key idea is **runtime composition**. The shell does not import remote code at build time. It reads the manifest, fetches the remote's entry file, and mounts what the remote exposes. That is why each remote can be redeployed without rebuilding the shell.

It helps to name two kinds of remote:

- **Domain remotes** own a whole route tree, such as *Billing* or *Orders*.
- **Capability remotes** expose one reusable widget that several domains embed, such as an *Audit log* or *Attachments* panel. Each is built once and configured per host.

MFEs are **not** a component library, an iframe per team, or a monorepo. A monorepo is a convenient home for MFEs, but it does not make them MFEs.

## When to use them, and when not to

Use MFEs when you have an organisational problem: several teams blocked on one release train. Do not use them to fix a technical one. A well-structured modular monolith with lazy-loaded routes gives most of the code-organisation benefits at a fraction of the cost.

| Signal | Points to MFEs | Points to a modular monolith |
| --- | --- | --- |
| Teams on the front end | 3 or more, each owning a business domain | 1–2 teams |
| Release cadence | Domains need to ship on different days | One release train is fine |
| Domain boundaries | Clear: screens rarely mix two domains' data | Blurry: most screens mix everything |
| Shared UI | A versioned design system already exists, or will | Styles are copied per page |
| Platform capacity | Someone can own the shell, CI and contracts | Nobody has time for platform work |
| Legacy migration | You must replace an old app screen by screen (strangler pattern) | Greenfield app with one team |
| Performance budget | A few extra requests per route are acceptable | Every kilobyte and round trip matters |

Costs you take on with MFEs:

- **Runtime failure modes.** A remote can be down, slow or on the wrong version, so the shell must survive all three.
- **Shared-dependency discipline.** Framework versions must match across remotes, or you get two copies and subtle bugs.
- **Contract governance.** The shared contract becomes a public API. It can only grow, never break.
- **More pipelines.** Every remote needs build, test, deploy and rollback.
- **Harder debugging.** "The page is broken" now has many possible owners, so tracing becomes a requirement.

Rule of thumb: if you cannot name the team that owns each proposed remote, you are not ready to split it.

## Implementation approaches compared

For most single-page apps, choose **runtime federation**: Module Federation, or Native Federation on import maps. It is the only approach that gives independent deploys, shared framework instances and seamless in-app navigation together.

| Approach | How it composes | Independent deploy | Shared framework | Best for |
| --- | --- | --- | --- | --- |
| Build-time packages | Remotes published to npm and imported by the shell | No: the shell must rebuild | Yes | Shared libraries, not MFEs |
| Iframes | Each remote in its own frame | Yes | No | Embedding third-party or legacy apps |
| Server-side / edge includes | The server stitches HTML fragments | Yes | No | Content sites and SEO-heavy pages |
| Web Components | Each remote ships a custom element | Yes | Usually no | Mixing frameworks |
| Module Federation (Webpack/Rspack) | The shell loads `remoteEntry.js` at runtime and shares chunks | Yes | Yes | Webpack-based SPAs |
| Native Federation (import maps) | The shell loads `remoteEntry.json` plus ES modules through an import map | Yes | Yes | esbuild/Vite toolchains such as the Angular CLI |

The rest of this guide uses runtime federation. Native Federation is the default for modern Angular because it works with the esbuild builder. The concepts (exposes, shared, manifest) are identical in Module Federation.

## Reference architecture

&#91;embedded content: reference architecture · shell, manifest, domain, hub and capability remotes\]

The shell fetches the manifest, then lazy-loads each domain remote when its route is visited. A hub remote mounts capability remotes as tabs. Remotes never import each other: they meet only through the shared contracts and singletons in the bottom band.

## Setting up the platform from scratch

Build the platform before the features. Steps 1–10 normally take a platform team one to two sprints. The gate at the end: a generated remote reaches a deployed shell through the real pipeline.

1. **Pin the toolchain.**
   - Commit `.nvmrc` and the `engines` field in `package.json`, for example Node 22 and npm 11.
   - Make CI use the same versions.
   - Most "works on my machine" bugs are version drift.
2. **Create the monorepo.**
   - Use Nx, Turborepo or pnpm workspaces.
   - Folder layout: `apps/` for the shell and remotes, `libs/` for shared code, `tools/` for generators and scripts.
   - One repo makes contract changes atomic. Each app still builds and deploys alone.
3. **Create the shell.**
   - Header, navigation, sign-in, a not-found page, and an error boundary component.
   - No business screens.
   - Add federation in *host* mode.
4. **Write the shared-dependency config once.**
   - Put it in one file, for example `libs/federation/shared.config.js`.
   - Every app's federation config calls it.
   - Framework, router, RxJS and the design system are singletons with strict versions.
   - Add a CI check that fails if any app defines its own `shared` block.
5. **Create the contracts library.**
   - Types, injection tokens, event names and route constants shared by shell and remotes. No UI and no logic.
   - Rule: additive changes only.
6. **Create the runtime manifest.**
   - A JSON map of remote name to URL, one file per environment (local, dev, staging, prod).
   - The shell fetches it at startup, before bootstrapping. Changing a URL never needs a shell rebuild.
7. **Write a safe remote loader.**
   - One function wraps every remote load with a timeout, structured logging and a typed error.
   - The shell's routes call only this function.
8. **Add mocks behind a firewall.**
   - Use a mock API (for example MSW) and mock auth, so every app runs alone.
   - Load them only from a separate `main.mock.ts` entry and a `mock` build configuration.
   - A CI scan fails if mock code appears in a production bundle.
9. **Build the generator.**
   - `nx g mfe <name>` creates a remote with the right ports, federation config, tags, lint rules, tests, CI file and manifest entries.
   - Never hand-copy an app.
10. **Set up CI/CD per app.**
    - Each app gets its own pipeline that runs only when that app or its dependencies change.
    - Pipeline: lint → test → build → deploy to a versioned path → update the manifest → smoke test. Rollback means pointing the manifest back.
11. **Enforce boundaries.**
    - Tag projects (`type:shell`, `type:remote`, `type:lib`, `scope:<domain>`) and add lint rules.
    - Remotes never import each other. Shell and remotes meet only through contracts.
12. **Write the docs and a decision log.**
    - A README, an architecture overview, a "how to add an MFE" guide, a troubleshooting guide, and a register of the decisions with their reasons.

## Step by step: your first new MFE

Follow these steps in order. Each ends with something you can see or run. If one fails, stop and check the troubleshooting section before going on.

1. **Agree on what the MFE is.**
   - Write down with your lead: its name (`mfe-<domain>` or `mfe-cap-<capability>`), its kind (domain or capability), the owning team, its route or mount point, and what it exposes.
   - If it needs data the shell already has, name the contract it will read.
2. **Generate it. Never copy.**
   - Command: `npx nx g @platform/tools:mfe --name=orders --kind=domain`.
   - The generator registers a free port, the federation config, project tags, a CI file and manifest entries for every environment.
   - Read the files it created before changing anything.
3. **Run it alone.**
   - Command: `npx nx serve mfe-orders --configuration=mock`.
   - The remote opens on its own port with mock data and a mock user. This is your daily loop: you rarely need the whole platform running.
4. **Build the screen inside the remote.**
   - Write the components, services and routes in `apps/mfe-orders/src/app`.
   - Use design-system components instead of custom CSS.
   - Read the user, permissions and selected context from contract services, never from the shell's internals.
   - Add a header comment to each file saying what it is for.
5. **Expose only what the shell needs.**
   - Usually a domain remote exposes one entry: `'./Routes'`. A capability remote exposes one component: `'./AuditTrail'`.
   - Everything else stays private. Each exposed path becomes an API you must keep working.
6. **Add mocks for your API.**
   - Add handlers and fixtures to the mocks library for each endpoint you call.
   - Cover the success, empty and error cases, so a reviewer can see all three states.
7. **Mount it in the shell.**
   - A domain remote: add a route that calls the safe loader with the remote name and the exposed `'./Routes'`, plus a navigation entry with its permission.
   - A capability remote: add it to the host's tab or panel configuration.
   - Then run `npm run start:all` and click through from the shell.
8. **Write the tests.**
   - Unit tests: components and services, including the empty and error states.
   - One end-to-end test that goes from the shell to your screen.
   - One test that shows the shell survives when your remote fails to load.
9. **Run the full check locally.**
   - `nx affected -t lint test build`, then the platform checks (shared config, headers, no mocks in prod).
   - A unit test run does not type-check, so always build too.
10. **Open the merge request.**
    - The pipeline builds and deploys only your remote, updates the dev manifest and smoke-tests it.
    - Ask for review from your domain owner and, for contract changes, the platform team.

## Checklist: what every new MFE needs

Tick every item before the first merge to main.

- [ ] Created by the generator, with a unique dev port and an entry in every environment's manifest
- [ ] Owner listed in CODEOWNERS; project tags set (`type:remote`, `scope:<domain>`)
- [ ] Federation config calls the shared-dependency helper; no local `shared` block
- [ ] Exposes only what the shell mounts (`./Routes` or one component)
- [ ] Reads user, permissions and context only through the contracts library
- [ ] No imports from another remote or from the shell
- [ ] Route or tab guarded by a permission; the backend enforces it too
- [ ] UI built from design-system components and tokens; no copied components
- [ ] Loading, empty and error states for every data call
- [ ] Mock handlers and fixtures; runs alone in `mock` configuration
- [ ] No mock code in the production bundle (CI scan passes)
- [ ] Structured logger with the app's name; expected errors (such as 404 meaning "none yet") marked as expected
- [ ] File header comment on every source file
- [ ] Unit tests, an end-to-end test from the shell, and a remote-down test
- [ ] Own CI pipeline: lint, test, build, deploy, smoke test, rollback
- [ ] Production build passes; bundle size within budget
- [ ] Entry in the docs: what it does, its owner, its routes and its API

## Integrating an MFE with the shell

&#91;embedded content: remote load flow · 4 steps, 1 decision, a Retry loop\]

Every remote enters the page through one safe loader, so a slow or broken remote costs one section, not the whole app.

Rules for the integration:

- **The shell knows names, not code.** A route entry holds only the remote's name, its exposed module and the permission it needs. The URL comes from the manifest.
- **One loader for everything.** Routes, tabs and panels all call the same function. It applies a timeout, logs start, success and failure, and throws a typed error with a code.
- **Boundaries at every mount.** Each route outlet, tab and panel sits in an error boundary that shows a fallback with Retry. Retry must really reload: reset the router's cached failure, or load through a guard.
- **Guards in the shell, enforcement in the API.** The shell hides what a user may not open. The backend still checks every call.
- **The remote owns everything below its route.** Its child routes, page title, data fetching and loading states belong to the remote. The shell only provides the outlet and the context.
- **Old URLs keep working.** When a screen moves, add a redirect guard that maps the full old path and query to the new one. Redirects must not drop the rest of the URL.
- **Context flows through contracts.** The current user, permissions and selected record are read from contract services the shell provides, never from shell internals or globals.

## Communication between shell and MFEs

Pick the weakest coupling that does the job. In practice, four channels cover almost every need, and all of them are declared in the contracts library.

| Need | Channel | Example | Rule |
| --- | --- | --- | --- |
| Where am I, which record? | URL (route and query params) | `/orders/123?tab=history` | The default. It survives reload and can be shared and bookmarked |
| Configure an embedded widget | Inputs | `caseId`, `resolutionCodes` passed to a capability tab | The host passes data down; the widget never reads the host's state |
| Something happened | Typed event bus | `ORDER_CANCELLED { orderId, at }` | Fire and forget. Events are past-tense facts, not commands |
| Shared current context | Context store (a signal or observable service) | The customer selected in the hub, read by every tab | One writer, many readers. Read-only for consumers |

Rules:

- **The contract is additive only.** Add fields and events; never rename or remove one while any deployed remote uses it. Deprecate first, remove after every consumer has shipped.
- **Singletons come from the shell.** The bus and stores are provided at the shell root and shared as one instance. If they are not in the shared config, each remote gets its own copy and messages vanish.
- **No direct calls.** A remote never imports another remote or calls a shell function. If two remotes need the same data, both fetch it or both read a context store.
- **Payloads are small and serialisable.** Send IDs and facts, not whole objects or class instances.
- **Backend owns truth.** For example, audit entries are written by the API, not by the UI posting an event. Events only tell other UI parts to refresh.
- **Avoid `window` globals and `localStorage` for messages.** They are untyped, hard to trace, and leak between tabs.

## Shared dependencies and the design system

Shared dependencies are where most MFE bugs come from. Keep one config, make framework packages singletons, and upgrade everyone together.

- **One shared config, used by every app.**
  - The framework core, router, forms, HTTP client, RxJS, the design system and the contracts library are `singleton: true, strictVersion: true`.
  - A mismatch should fail loudly at load time, not misbehave quietly.
- **Share whole packages, not sub-paths.**
  - A sub-path of a shared internal library (`@org/auth/mock`) may resolve to a second copy at runtime.
  - Give such code its own package name (`@org/auth-mock`).
- **Shared libraries are bundled whole.**
  - Anything a shared library exports ends up in every bundle, including test helpers.
  - Keep mocks and test utilities in separate packages that production code never imports.
- **Watch for "injection context" errors.**
  - Errors such as Angular's NG0203 inside a remote usually mean two copies of the framework.
  - Check that the remote's federation build does not skip dependencies it actually uses (in Native Federation, keep `ignoreUnusedDeps: false` if needed).
- **Upgrade in one go.**
  - Framework upgrades happen in the monorepo for all apps at once and ship as one coordinated release.
  - Independent deploys apply to features, not to framework majors.
- **Treat the design system as an external, versioned package.**
  - Never fork its components into an app.
  - If a component is missing, file a request, use a documented workaround, and remove it when the next version ships.
  - A sync script that bumps the version in one place is enough.
- **Use tokens for colour, spacing and type.**
  - Fix colours to meaning (status, entity) rather than position, so charts and badges look the same in every remote.

## Testing, CI/CD, deployment and rollback

Each app has its own pipeline, so a deploy touches only what changed and a rollback is a manifest edit, not a rebuild.

**Test layers**

| Layer | Runs | Proves |
| --- | --- | --- |
| Unit (Vitest or Jest) | Per app, on every push | Components, services, and empty and error states |
| Platform checks | Whole repo, on every push | One shared config, no mocks in production, boundaries, file headers |
| Contract smoke | After each deploy | The deployed remote's entry loads and exposes what the manifest promises |
| End-to-end (Playwright) | Shell plus remotes, on main and before promotion | Navigation into each remote, cross-remote events, remote-down fallback |

**Pipeline per app**

1. Detect affected apps (`nx affected`) and generate child pipelines only for them.
2. Lint, test and build the production configuration.
3. Upload the build to an immutable, versioned path, for example `/mfe-orders/1.4.2/`. Never overwrite a version.
4. Update that environment's manifest to point at the new path.
5. Smoke-test the remote entry, then run the end-to-end suite.
6. Promote dev → staging → prod by copying the manifest entry, not by rebuilding.

**Rollback.** Point the manifest entry back to the previous version. Users get it on their next page load, and nothing is rebuilt. Keep at least the last few versions deployed.

**Caching.** Version folders can be cached forever. The manifest and each `remoteEntry` must be served with `no-cache`, or users stay on old versions.

**Local practice that saves hours:**

- Wait until every dev server is up before running end-to-end tests.
- Restart dev servers after a production build in the same workspace.
- Clear the task runner's cache and daemon when it reports a lock held by another process.

## Observability and troubleshooting

Every remote load and every failed API call must leave a structured, searchable trace. Otherwise "the tab is blank" takes hours to assign to the right team.

- **One logger factory.** Call `createLogger('<app or area>')` to get levelled, structured entries: timestamp, source, message and context. Use it, not `console.log`. The level is set per environment and can be raised at runtime for one session.
- **Trace every remote load.** The safe loader logs start, success with its duration, and failure. A failure carries the remote name, manifest URL, exposed module and a stable error code, for example `MF_REMOTE_UNREACHABLE`, `MF_MODULE_NOT_EXPOSED` or `MF_TIMEOUT`.
- **Correlation ID on every request.** An HTTP interceptor adds a correlation header and logs failed calls with status, URL, ID and duration. Statuses the caller expects, such as 404 meaning "none yet", are logged at debug level, so support does not chase non-problems.
- **A diagnostics command.** Expose something like `platformDiagnostics()` in the console. It prints the active manifest, each remote's URL and load status, shared versions, the current user's permissions and recent errors. Ask for its output in every bug report.
- **Failure isolation.** Wrap each route, tab and panel in an error boundary. It shows "This section could not be loaded" with a Retry button and the error code, while the rest of the page keeps working.

Troubleshooting by symptom:

| Symptom | Likely cause | First check |
| --- | --- | --- |
| Blank area with the fallback message | Remote down, wrong URL or CORS | Diagnostics output; the network tab for `remoteEntry` |
| "Module not exposed" | Exposes name mismatch | The remote's federation config versus the host's loader call |
| Injection or NG0203 errors only inside the remote | Two copies of the framework | Shared config and shared versions in diagnostics |
| Works locally, old UI in an environment | Cached manifest or entry file | Cache headers; the manifest version |
| Retry does nothing | Router cached the failed lazy route | Reset router config or use a guard that reloads |
| Mock data visible in production | Mock code reached the bundle | The no-mocks scan; imports outside the mock entry |

## Pitfalls and lessons learned

These came up while building a 17-app platform. Each one cost real time, and each has a cheap prevention.

| Pitfall | What happened | Prevention |
| --- | --- | --- |
| Forking a shared layout per domain | Five near-identical copies drifted apart | One layout library; screens described as config (tabs, columns, actions) |
| Mock code in production | Mock auth shipped inside a shared library's bundle | Separate mock packages, a separate mock entry, a CI bundle scan |
| Mock build overwrote the production build | Both wrote to the same `dist` folder | A different output path per configuration |
| Prefix redirect lost the URL | `/old/123?tab=x` became `/new` | Legacy redirects as a guard that rewrites the full path and query |
| Retry did not reload a failed remote | The router cached the failed lazy load | Reset the route config, or load through a guard |
| Kept-alive tabs reset on navigation | A derived signal re-ran on an unrelated change | Read unrelated signals untracked; test tab state across navigation |
| Expected 404s flooded logs as warnings | "No decision yet" was logged as a failure | Mark expected statuses per request |
| Fragile end-to-end tests | Racing lazy loads; ambiguous text locators | Navigate inside the app; assert by role and exact name; scope locators |
| Service-worker mocks missed by test routing | The test only intercepted page requests | Intercept at the browser-context level |
| Unit tests green, build red | The test runner does not type-check | Always build before merging |
| Scripted bulk edits silently missed | A formatter had changed the text being matched | Edit precisely, then grep to confirm |

The general lesson: write a check for anything you agreed on, such as one shared config, no mocks in production, file headers or boundaries. Rules that only live in documents erode within weeks.

## Glossary

| Term | Meaning |
| --- | --- |
| Shell / host | The app loaded first; owns chrome, routing and error boundaries |
| Remote | A separately deployed bundle the shell loads at runtime |
| Domain remote | A remote that owns a route tree for one business area |
| Capability remote | A remote exposing one reusable widget embedded by several hosts |
| Hub | A remote that hosts other remotes as tabs or panels on one page |
| Exposes | The list of modules a remote makes loadable, such as `./Routes` |
| Shared | Dependencies loaded once and reused by shell and remotes |
| Singleton | A shared dependency that must exist exactly once at runtime |
| Manifest | Per-environment map from remote name to its entry URL |
| `remoteEntry` | The file describing a remote's exposes and shared dependencies |
| Import map | Browser feature mapping bare imports to URLs; used by Native Federation |
| Contract | Shared library of types, tokens and events; additive changes only |
| Event bus | Typed publish and subscribe channel for past-tense facts |
| Context store | A read-only shared state service with one writer |
| Error boundary | A wrapper that shows a fallback and Retry when its content fails |
| Generator | A scaffolding command that creates a new app correctly configured |
| Strangler pattern | Replacing a legacy app route by route behind the same URL space |

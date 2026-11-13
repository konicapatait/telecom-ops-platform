---
name: mfe-add-remote
description: Add a new federated remote to an Nx + Angular + Native Federation micro-frontend platform: a domain remote (owns a route tree, exposes ./Routes), a capability remote (one embeddable component with a typed input contract), or a hub (hosts other domain remotes as tabs). It works inside the shell monorepo via the generator or in an external repo, and covers naming, entitlements, mock APIs, cross-MFE communication, embedding, CI deploy, removal and the checks that prove it works. Use whenever someone asks to create, register, expose, embed, deploy or remove a remote/MFE.
---

# Add a remote

Self-contained recipe. Generator code and templates: `../mfe-shell-setup/references/generator.md`. Loader and lib code: `../mfe-shell-setup/references/libs.md`. The isolated legacy app is a different case (own Angular, shares nothing): use **mfe-onboard-legacy-app**. Everything here is for remotes on the **same** Angular version as the shell.

## Step 0. Read before acting
Read `docs/migration/project-profile.md` and `docs/migration/legacy-inventory.md` in the shell repo. If either is missing, run the intake in **mfe-platform-blueprint** `references/intake.md` first. Use the profile's names for every placeholder; if a needed value is missing, ask the user (batches of up to 4) and record the answer in the profile. The legacy app is the source of truth for behaviour; these skills are the source of truth for architecture.

## Replacing a legacy screen (parity first)
When the remote replaces a legacy screen (a strangler slice from `docs/migration/slice-map.md`), the legacy screen is the specification:
1. Read the legacy route, component, template, form, services, guards and role rules for that screen. Write `docs/migration/slices/<remote>.md` with:
   - fields and order
   - validations and messages
   - role/field rules (hide, mask, read-only)
   - API calls (method, path, payload, errors)
   - empty and error states
   - links in and out
   Cite the legacy file for each item.
2. Ask the user only about gaps and about intended changes. Default = same behaviour.
3. Reuse the legacy entitlement/role names (mapped in the profile) and the legacy API endpoints; mock them in MSW with payloads copied from the legacy types or recorded responses.
4. Build with the design system; keep wording identical unless the user approves a change.
5. Parity E2E: the same scenarios run against the legacy screen (under `/<legacy>/…`) and the new one, with the same assertions.
6. Add the strangler redirect (shell `REDIRECTS` + the legacy bridge's `shellOwned`) only after parity passes. Update the slice map status.

## Pick the kind
| Kind | Exposes | Mounted by | Inputs | Notes |
| --- | --- | --- | --- | --- |
| domain | `./Routes` (default export `Routes`) | shell route `/<route>/**` from `SHELL_REMOTE_ROUTES` | route params, read inside the remote | root route has `canActivate: [entitlementGuard('<route>:view')]` |
| capability | ONE standalone component `./<Pascal>` | a host: `CapabilitySlotComponent`, a tab host or panel host, via `loadCapability` | a named contract `<Pascal>Inputs` in `libs/contracts`; never reads the route | fetches its own data; renders 403 as "No access" |
| hub | `./Routes` whose page hosts other domain remotes as tabs | shell route | – | per-tab isolation: `{ canMatch: [remoteAvailable(r)], loadChildren }` + in-tab fallback |

Name: `mfe-<name>` (domain/hub) or `mfe-cap-<name>` (capability). The name is the manifest key, federation `name`, Nx project, `RemoteName` member and S3 prefix. Never rename a deployed remote: add a new one and redirect the old URL.

### Hub tab isolation (hub kind)
```ts
/** @file Hub routes: one tab per domain remote; a missing or failing remote breaks only its tab (ADR-0006). */
import { CanMatchFn, Routes } from '@angular/router';
import type { RemoteName } from '@platform/contracts';
import { isRemoteDeployed, loadRemoteRoutes } from '@platform/mf-manifest';
import { TabUnavailableComponent } from './tab-unavailable.component'; // same shape as the shell's SectionUnavailableComponent

export interface HubTab { id: string; label: string; path: string; remote: RemoteName; entitlement?: string }
export const HUB_TABS: HubTab[] = [ /* config, not layout code */ ];

const remoteAvailable = (remote: RemoteName): CanMatchFn => () => isRemoteDeployed(remote);

/** Factory, so the tab's Retry can `router.resetConfig(...)` and re-attempt the load without a page reload. */
export function hubTabRoutes(): Routes {
  return HUB_TABS.flatMap((t) => [
    {
      path: t.path,
      canMatch: [remoteAvailable(t.remote)],
      loadChildren: () => loadRemoteRoutes(t.remote).catch(() => [{ path: '**', component: TabUnavailableComponent, data: { label: t.label, remote: t.remote } }]),
    },
    { path: t.path, component: TabUnavailableComponent, data: { label: t.label, remote: t.remote } }, // not deployed here
  ]);
}
```
Each tab remembers its last URL. Domain remotes in a hub get any shared filter through a context store, never through the URL of another remote.

## A. Inside the shell monorepo (default)
1. **Generate** (only way, ADR-0013), dry run first:
   ```bash
   npx nx g @platform/tools:mfe orders --kind=domain --route=orders --label="Orders" --group="Operations" --entitlement=orders:view --owner=@<group>/orders-team --dry-run
   npx nx g @platform/tools:mfe notes --kind=capability --label="Notes" --exposedName=Notes --owner=@<group>/notes-team --dry-run
   ```
   It writes `apps/<app>/**` (two-line `federation.config.js`, harness, `start-mocks`, environments, `.gitlab-ci.yml`), adds the name to `REMOTE_NAMES`, a `localhost:<port>` entry to the local manifest, a `SHELL_REMOTE_ROUTES` line (domain/hub) and a CODEOWNERS line.
2. **Entitlement** end to end: agree the name with the backend → add it to mock personas (`libs/mocks/src/personas.ts`) → registry `entitlement` hides the nav entry → `entitlementGuard` in the remote's root route → `*hasEntitlement="'x'"` on controls → the API (and its mock) answers 403.
3. **Data** (mock-first): contract type in `libs/contracts` (additive) → typed fixture with stable, distinctive ids → MSW handler `http.get(api('/path'), …)` using `mockDelay()`, `shouldFailApi()`, `personaFromRequest()` + `forbidden()` → register in `allHandlers` → Node spec (`onUnhandledRequest: 'error'`) → add the fixture ids to `check-no-mocks-in-prod.mjs`. In components: `rxResource` + `HttpClient`; expected statuses via `{ context: expectHttpErrors(404) }`.
4. **Build it** in the standalone harness: `npx nx serve <app>` (mocks on). Then composed: `npm run start:all`, open the shell on :4200.
5. **Capability input contract**: add `export interface NotesInputs { subjectId: string }` to contracts; the component declares exactly those `input.required()`s; the host passes them (`CapabilitySlotComponent [inputs]`, or `setInput` in a tab host). Need more inputs later? Extend the named contract additively, never an untyped bag.
6. **Embed a capability**: `<shell-capability-slot remote="mfe-cap-notes" exposedModule="./Notes" label="Notes" [inputs]="{ subjectId: id }" />` in the shell, or the same pattern (a small host with loading / error + Retry) inside a family layout lib. Every host isolates failures to itself.
7. **Cross-MFE communication**, narrowest first: inputs → a context store in contracts (one writer) → `PlatformEventBus` (`PlatformEvent.*.v1`) → read-only shell singletons. A remote never imports another app and never navigates into another section: it emits `PlatformEvent.OPEN_ROUTE` and the shell routes (ADR-0017).
8. **Styles**: design-system components and `--ds-*` tokens; no global CSS in a remote (ADR-0001). Every component OnPush, signals (zoneless).
9. **Logging**: `createLogger('<app>')`; no `console.*`; context = ids only, never tokens or personal data.
10. **Moved URL?** Add `{ from, to }` to `REDIRECTS` in the shell registry (guard-based; keeps the path rest and query).

## B. In an external repository (same framework)
Only when a team must own its repo. All of these are checked in CI:
- Exactly the shell's versions of every shared singleton (`@angular/*`, `rxjs`, `tslib`, design system) and of the platform libs. Publish the platform libs (`@platform/contracts`, `auth`, `entitlements`, `utils`, `mf-manifest` including `shared.config.js`) to the GitLab npm registry at the shell's version; the remote depends on them exactly.
- Its `federation.config.js` calls the published `withPlatformFederation`. Never copy the shared block.
- Its pipeline `include:`s `platform-shell/ci/templates/remote-deploy.gitlab-ci.yml` (see **mfe-aws-hosting**).
- The shell repo adds its name to `REMOTE_NAMES` and the registry (a small MR to the platform team).
- Lockstep upgrades: an Angular or design-system bump in the shell means releasing every external remote in the same window, otherwise `strictVersion` fails at runtime (`MODULE_IMPORT_FAILED`).

## Deploy (both cases)
Per-app pipeline: lint → test → build (`production` + `mock`) → mock scan → deploy dev (mock build) → contract smoke → manual staging → manual prod → manual rollback. Deploy = upload immutable `mfe/<app>/<version>/`, rewrite ONE manifest key, append release history. Rollback = rewrite that key back. Details: **mfe-aws-hosting**.

## Remove a remote
1. Remove its registry line / embedding (release the shell).
2. Remove its key from each environment's manifest (rollback script or a manifest edit job).
3. Delete the app (`npx nx g @nx/workspace:remove <app>`), its CODEOWNERS line and pipeline file.
4. Keep its S3 version folders until retention expires.
5. Remove its name from `REMOTE_NAMES` only once no code references it.

## Done means verified
```bash
npx nx run-many -t lint test build -p <app> shell
npm run check:shared-config && npm run check:headers && npm run check:no-mocks
PW_CHANNEL=chrome npm run e2e
```
Add an E2E for the new section or slot. On dev after deploy, check:
- contract smoke is green
- the section loads from the deployed URL
- with its key removed from the manifest, only its section/slot shows "unavailable", and Retry works after you restore it
- a persona without the entitlement sees no nav entry and gets 403 from the API
- `platformDiagnostics()` shows the load

Report what ran.

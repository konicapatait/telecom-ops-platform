# ADR-0007: Discover remotes from a per-environment runtime manifest; one failing remote breaks only its own section

- **Status:** Accepted
- **Date:** 2026-10-02

## Context
Remotes deploy independently, and rollback must not need a rebuild. A remote that is down must not take the shell down (Phase 1 gate).

## Decision
- Each environment serves **`/mf-manifest.json`** (`{ "<remote>": "<url>/remoteEntry.json" }`) next to the shell's `index.html`, with `no-cache`. Deploying a remote writes one entry and rolling back rewrites it. The shell build contains **no** remote URLs.
- Locally, `libs/mf-manifest/manifests/local/mf-manifest.json` points at `localhost` ports (maintained by the generator). The deployed environments' seeds are in `manifests/<env>/`, and the deploy job owns the live copy.
- **Boot order** (`apps/shell/src/main.ts`): fetch the manifest (failure means `{}`), then `initFederation(manifest)`, then dynamic `import('./bootstrap')`. Unreachable remotes are logged by Native Federation, not thrown.
- `loadRemote()` always passes `remoteName` **and** `remoteEntry`, so a remote that was down at boot is registered when the user retries.
- Shell routes come from a typed registry (`apps/shell/src/app/routing/remote-registry.ts`, maintained by the generator). Each route's `loadChildren` falls back to `SectionUnavailableComponent`. **Retry** calls `router.resetConfig(appRoutes())` to drop Angular's cached failed load, then navigates again, with no page reload.
- The nav shows a section only if its remote **is in the manifest** and the user **holds its entitlement**.

## Consequences
- Rollback is a manifest change (`tools/ci/rollback-app.mjs`).
- The manifest must carry only URLs. Native Federation reads it as-is, so nav metadata lives in the typed shell registry, not the manifest.
- The Phase 1 gate is encoded in `apps/shell-e2e` ("a stopped remote breaks only its own section, and Retry recovers it").

## Alternatives considered
- **Remote URLs baked into the shell build:** every remote release would need a shell release. Rejected.
- **Nav metadata in the manifest:** breaks Native Federation's manifest format. Rejected.

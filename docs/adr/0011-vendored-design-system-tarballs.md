# ADR-0011: Until the internal registry exists, consume the design system as vendored, versioned tarballs

- **Status:** Accepted (temporary; supersede once `@org/*` is published)
- **Date:** 2026-10-02

## Context
ADR-0001 requires an external, versioned package. No internal npm registry was available when this repo was created, and the platform must still **build on its own** (CI, a fresh clone) without the sibling repo checked out.

## Decision
- The `design-system` repo produces `dist/packages/org-design-{system,tokens}-X.Y.Z.tgz` (`npm run release:local`). Its CI publishes the same packages to the registry on a `vX.Y.Z` tag.
- The platform commits those tarballs to **`vendor/`** and references them as `"@org/design-system": "file:vendor/org-design-system-X.Y.Z.tgz"`. The version is in the file name, so it is still exactly one pinned version.
- `npm run ds:sync [../design-system]` copies new tarballs, rewrites `package.json`, installs, and reminds you that every app is affected.

## Switching to the registry
1. Uncomment `@org:registry=` in `.npmrc` and add the auth token as a CI variable.
2. `npm i -E @org/design-system@X.Y.Z @org/design-tokens@X.Y.Z` and delete `vendor/`.
3. Renovate takes over (`renovate.json` already groups `@org/design-*`).
4. Mark this ADR "Superseded".

## Consequences
- Binary files in git (about 20 KB each). That's acceptable for a stub-sized package, but don't keep this arrangement long-term.
- Renovate cannot see `file:` dependencies, so until the switch, bumps are manual (`ds:sync`).

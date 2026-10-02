# ADR-0018: The host shares every Angular secondary entry point (`ignoreUnusedDeps: false`)

- **Status:** Accepted (amends ADR-0008)
- **Date:** 2026-10-02

## Context
Phase 2 remotes use `rxResource` from `@angular/core/rxjs-interop`, and the shell does not. With `features.ignoreUnusedDeps: true`, Native Federation builds only the shared packages each app actually imports. So the host offered no `@angular/core/rxjs-interop`, and the remotes' own build was used. That build imports internal chunks (`@nf-internal/chunk-…`) carrying a **second copy of core's injection state**, and every `rxResource` failed at runtime with `NG0203: rxResource() can only be used within an injection context`. Unit tests could not see this, because it only happens when composed. The E2E gate caught it.

## Decision
- `withPlatformFederation` sets `features: { ignoreUnusedDeps: false }`. The host builds and shares **every** secondary of every shared package (with `includeSecondaries`), so the first copy registered is always the host's and is consistent with the host's core.
- Secondaries that need packages we do not install are put on the **skip list** (`@angular/platform-browser/animations` and `/animations/async`, which need `@angular/animations`).

## Consequences
- Builds are a little slower: 6 apps took about 37 s cold locally. Unused secondaries are never downloaded (import maps load on demand).
- If a new shared package has a secondary that fails to bundle, add it to `skip`. Do **not** turn `ignoreUnusedDeps` back on.
- `contract-smoke.mjs` now checks about 116 shared entries per remote against the pins.

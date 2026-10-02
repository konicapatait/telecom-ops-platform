# ADR-0001: Consume the design system as an external, exact-pinned npm package that is a runtime singleton and never a remote

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Implementation plan, decision 1 and "Design system as an external dependency"

## Context
The design-system team owns `@org/design-system` (components built on `@angular/aria`) and `@org/design-tokens` and releases them on their own cadence. The platform has around 15 remotes. If two copies of the component library load at runtime, you get two overlay containers, two live-announcers and two focus-trap stacks, which means dialogs fighting for focus.

## Decision
1. The design system lives in its **own repository** (`../design-system`) and is consumed as **npm packages**.
2. The platform pins **one exact version** in the root `package.json` (`.npmrc` has `save-exact=true`). There is no per-app version.
3. `@org/design-system` is in the **single federation shared block** (`libs/mf-manifest/src/shared.config.js`) as `singleton: true, strictVersion: true`. It is never exposed as a remote.
4. **Tokens come from the shell.** Only the shell loads `tokens.css` and `reset.css` (shell `project.json` → `styles`). Remotes ship no global CSS. Their standalone dev harness loads tokens in the `development` configuration only.
5. Upgrades arrive as **one Renovate merge request** for the whole workspace (`renovate.json`). Because Nx cannot see the runtime singleton, a design-system bump runs **every app** (`tools/ci/generate-pipeline.mjs` detects `@org/design-*` changes in `package.json`), not `nx affected`.

| Change | DS semver | Platform action |
| --- | --- | --- |
| Bug fix, polish | patch | Renovate auto-merges after green CI (and visual check once Phase 2 adds it) |
| New component or input | minor | Merge after green CI |
| Removed or renamed input, changed default | major | Scheduled upgrade window; all apps rebuilt and deployed together |

## Consequences
- One DS version on the page, so focus, overlays and announcers behave.
- A DS major is a coordinated release of every app. Keep majors rare and land deprecations one minor ahead.
- `contract-smoke.mjs` fails a deploy whose remote was built against a different pinned version (strictVersion would otherwise fail at runtime).
- The design-system stub in `../design-system` stands in until the real package exists (ADR-0011).

## Alternatives considered
- **DS as a federation remote:** one more runtime fetch on every screen, untyped boundary, and still needs singleton handling. Rejected.
- **DS as a monorepo lib:** couples two teams' release cycles and contradicts ownership. Rejected.
- **Caret ranges per app:** apps drift and strictVersion fails at runtime. Rejected.

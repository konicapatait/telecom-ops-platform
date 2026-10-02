# ADR-0014: Enforce architecture with Nx tags as lint errors

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
Tags on every project (`project.json`):

| Tag | Values |
| --- | --- |
| `type:` | `app`, `layout`, `contracts`, `shared-lib`, `mocks`, `e2e`, `tooling` |
| `family:` | `host`, `case`, `360`, `reporting`, `capability` (apps and layout libs) |
| `kind:` | `host`, `domain`, `capability` (apps) |
| `scope:` | `shared` (libs any app may use) |

Rules (`eslint.config.mjs`, all **errors**):
- `type:contracts` depends on **nothing**, and must not import `@org/*`, `msw` or `@okta/*`.
- `type:shared-lib` depends on `contracts` and `shared-lib` only.
- `type:layout` depends on `contracts` and `shared-lib` only, never an app.
- `type:app` depends on `contracts`, `shared-lib`, `layout` and `mocks` (mocks only via `start-mocks.ts`, enforced separately).
- `family:case` may use `scope:shared` and `family:case` only (that is, `libs/case-workspace`). The same pattern applies to `family:360`. `family:host`, `family:capability` and `family:reporting` may use `scope:shared` only.
- Angular: component and directive selectors must use the project prefix, and `OnPush` is required.

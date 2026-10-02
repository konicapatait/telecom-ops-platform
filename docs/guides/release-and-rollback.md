# Release and rollback

## Release
A release of one app = a new immutable folder plus **one manifest entry** changed.
- **dev:** automatic on `main` after lint, test and build. Contract smoke runs right after.
- **staging, prod:** manual jobs on the same pipeline (`<app>:deploy:staging`, `<app>:deploy:prod`), using the **same** production artifact.

Every deploy appends to `<env>/releases.json` (`version`, `url`, `previous`, `at`, `by`).

## Rollback (no rebuild)
GitLab: run `<app>:rollback:prod` (optionally set `ROLLBACK_TO=<short-sha>`).
CLI:
```bash
node tools/ci/rollback-app.mjs --app mfe-fraud --env prod                 # previous release
node tools/ci/rollback-app.mjs --app mfe-fraud --env prod --to 1a2b3c4    # specific release
```
The manifest is served `no-cache`, so users pick up the change on their next page load. The shell rolls back by re-copying its versioned build to the environment root.

## Coordinated releases
A design-system **major**, a `libs/contracts` breaking change (not allowed; additive only) or a `libs/case-workspace` change needs every affected app deployed together. Run the pipeline with `FULL_BUILD=true` and promote the apps in a single window.

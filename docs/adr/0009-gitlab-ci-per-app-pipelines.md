# ADR-0009: GitLab CI with a per-app pipeline file per app, stitched into an affected-only child pipeline; build once, promote; deploy and roll back by manifest

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Plan "CI/CD"; user choice: GitLab CI

## Decision
- **Root pipeline** (`.gitlab-ci.yml`): `workspace:checks` (shared-config drift, plus lint and test for affected **libs**), then `plan:apps`, then `apps` (a dynamic child pipeline), then `e2e:composed` (nightly, and manual on main).
- **Every app owns `apps/<app>/.gitlab-ci.yml`.** It is generated, and its jobs `extends:` templates in `ci/templates/app.gitlab-ci.yml`: lint, test, build, deploy:dev, smoke:dev, deploy:staging, deploy:prod, rollback:prod.
- **`tools/ci/generate-pipeline.mjs` decides which app files to include:**
  - `APP=<name>` (manual "Run pipeline"): that app only. This is how an app is **built and deployed independently**.
  - `FULL_BUILD=true` or an `@org/design-*` change in `package.json`: every app (ADR-0001).
  - Otherwise `nx show projects --affected --type=app`.
- **Build once, promote:** `.app-build` produces `dist/apps/<app>` (production) and `dist/apps-mock/<app>` (mock), then runs the no-mocks scan. Dev receives the mock artifact. Staging and prod receive the **same** production artifact. Environment differences live in runtime files (`mf-manifest.json`, `app-config.json`, ADR-0012).
- **Deploy** (`tools/ci/deploy-app.mjs`) uploads to `<env>/<app>/<version>/` (immutable, cached forever), writes **one** manifest entry and appends to `releases.json`. `resource_group: manifest-$DEPLOY_ENV` serialises manifest writes. The shell deploys to the environment root, plus a versioned copy kept for rollback.
- **Contract smoke** (`tools/ci/contract-smoke.mjs`) runs after the dev deploy. It reads the live manifest, fetches `remoteEntry.json`, checks that the exposed modules equal `federation.config.js`, and checks that the shared versions equal the pins.
- **Rollback** (`tools/ci/rollback-app.mjs`) points the manifest entry back at an earlier immutable build, with no rebuild.
- **Storage providers:** `s3` (AWS CLI; set `DEPLOY_BUCKET` and `PUBLIC_BASE_URL_<ENV>`) and `local` (a dry run into `dist/deploy/<env>`, servable with `node tools/ci/serve-env.mjs dev`).

## Consequences
- Deploy, smoke and rollback were verified locally with `--provider local`. The S3 path is written but **untested** until a bucket and CDN exist (see "Assumptions" in the decision log).
- Remote origins need CORS on the CDN when remotes are served from a different origin than the shell.
- Remote caching (Nx Cloud or a self-hosted cache) is recommended once the app count grows. Base and head SHAs are approximated from GitLab variables.

## Alternatives considered
- **Path-based `rules:changes` per app:** blind to the Nx graph (a lib change would miss its consumers). Rejected.
- **One monolithic pipeline:** no independent deploys. Rejected.

# GitLab CI pipeline: complete files (ADR-0008)

Shape: root pipeline → workspace checks → **plan** (which apps) → dynamic **child pipeline** made of each selected app's own `apps/<app>/.gitlab-ci.yml` → composed E2E. Each app builds once (production + mock); dev gets the mock build; staging and prod get the **same** production artifact. Deploy, smoke and rollback scripts are in **mfe-aws-hosting** `references/deploy-scripts.md`.

## CI/CD variables (Settings → CI/CD → Variables)
Scope by environment, so one job definition picks the right values:
| Variable | Scope | Example |
| --- | --- | --- |
| `AWS_ROLE_ARN` | `dev/*`, `staging/*`, `prod/*` (one value each; for per-app roles use `dev/<app>` scopes) | `arn:aws:iam::<acct>:role/deploy-<app>-dev` |
| `DEPLOY_BUCKET` | per environment | `<org>-<product>-web-dev` |
| `PUBLIC_BASE_URL` | per environment | `https://app.dev.<domain>` |
| `AWS_REGION` | all | `<region>` |
| `GITLAB_OIDC_AUD` | all | `https://gitlab.<company>.com` |
Prod-scoped variables: **protected**. Protect `main` and the `prod/*` environments (approval rules).

## `.gitlab-ci.yml` (root)
```yaml
# Root pipeline (ADR-0008): verify → plan → apps (child pipeline) → e2e.
# Build one app on its own: Run pipeline → variable APP=<app>.
workflow:
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "web"
    - if: $CI_PIPELINE_SOURCE == "schedule"

variables:
  APP: { value: "", description: "Build/test/deploy ONE app independently. Empty = affected apps." }
  FULL_BUILD: { value: "false", description: "true = run every app (a design-system bump does this automatically)." }

include:
  - local: ci/templates/base.gitlab-ci.yml

stages: [verify, plan, apps, e2e]

workspace:checks:
  extends: .node
  stage: verify
  rules:
    - if: $APP == ""
  script:
    - npm run check:shared-config
    - npm run check:headers
    - npx nx affected -t lint test --exclude='tag:type:app,tag:type:e2e' --base=$NX_BASE --head=$NX_HEAD

plan:apps:
  extends: .node
  stage: plan
  script:
    - node tools/ci/generate-pipeline.mjs > apps-pipeline.yml
    - cat apps-pipeline.yml
  artifacts: { paths: [apps-pipeline.yml] }

apps:
  stage: apps
  needs: [plan:apps]
  trigger:
    include:
      - artifact: apps-pipeline.yml
        job: plan:apps
    strategy: depend

e2e:composed:
  extends: .node
  stage: e2e
  image: mcr.microsoft.com/playwright:v1.63.0-noble   # match @playwright/test
  rules:
    - if: $CI_PIPELINE_SOURCE == "schedule"
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true
  script:
    - npx nx e2e shell-e2e
  artifacts:
    when: always
    paths: [test-output/shell-e2e/]
    reports: { junit: test-output/shell-e2e/junit.xml }
```

## `ci/templates/base.gitlab-ci.yml`
```yaml
# Shared building blocks.
.node:
  image: node:22-bookworm     # pin a digest/minor; deploy jobs need an image that also has AWS CLI v2 (recent: put-object --if-match)
  variables:
    npm_config_cache: $CI_PROJECT_DIR/.npm
    NX_DAEMON: "false"
    NX_NO_CLOUD: "true"
  cache:
    - key: { files: [package-lock.json] }
      paths: [.npm/]
    - key: nx-$CI_COMMIT_REF_SLUG
      paths: [.nx/cache]
  before_script:
    - npm ci --prefer-offline --no-audit --no-fund
    - export NX_HEAD=$CI_COMMIT_SHA
    - |
      if [ -n "$CI_MERGE_REQUEST_DIFF_BASE_SHA" ]; then export NX_BASE=$CI_MERGE_REQUEST_DIFF_BASE_SHA;
      elif [ -n "$CI_COMMIT_BEFORE_SHA" ] && [ "$CI_COMMIT_BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then export NX_BASE=$CI_COMMIT_BEFORE_SHA;
      else export NX_BASE=HEAD~1; fi

# GitLab OIDC → AWS (no static keys, ADR-0020). Variables are environment-scoped.
.aws-oidc:
  id_tokens:
    AWS_ID_TOKEN:
      aud: $GITLAB_OIDC_AUD

.aws-assume:
  script:
    - echo "$AWS_ID_TOKEN" > "$CI_PROJECT_DIR/.aws-web-identity"
    - export AWS_WEB_IDENTITY_TOKEN_FILE="$CI_PROJECT_DIR/.aws-web-identity"
    - export AWS_ROLE_SESSION_NAME="gl-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"
    - aws sts get-caller-identity
```

## `ci/templates/app.gitlab-ci.yml`
```yaml
# Job templates every app pipeline extends (apps/<app>/.gitlab-ci.yml). Each job works on ONE app: $APP.
include:
  - local: ci/templates/base.gitlab-ci.yml

stages: [verify, build, deploy-dev, smoke-dev, deploy-staging, deploy-prod, rollback]

variables:
  DEPLOY_PROVIDER: s3          # s3 | local (local = dry run into dist/deploy/<env>)

.app-lint:
  extends: .node
  stage: verify
  script: [npx nx lint $APP]

.app-test:
  extends: .node
  stage: verify
  script: [npx nx test $APP --coverage]

.app-build:
  extends: .node
  stage: build
  script:
    - npx nx build $APP --configuration=production
    - npx nx build $APP --configuration=mock
    - node tools/scripts/check-no-mocks-in-prod.mjs dist/apps/$APP
  artifacts:
    paths: [dist/apps/$APP/, dist/apps-mock/$APP/]
    expire_in: 30 days

.app-aws:
  extends: [.node, .aws-oidc]
  before_script:
    - !reference [.node, before_script]
    - !reference [.aws-assume, script]

.app-deploy:
  extends: .app-aws
  resource_group: manifest-$DEPLOY_ENV          # serialise manifest writes per environment inside this repo
  script:
    - node tools/ci/deploy-app.mjs --app $APP --env $DEPLOY_ENV --version $CI_COMMIT_SHORT_SHA --provider $DEPLOY_PROVIDER
  environment: { name: $DEPLOY_ENV/$APP, url: $PUBLIC_BASE_URL }

.app-deploy-dev:
  extends: .app-deploy
  stage: deploy-dev
  variables: { DEPLOY_ENV: dev }
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "web"

.app-contract-smoke:
  extends: .app-aws
  stage: smoke-dev
  script:
    - node tools/ci/contract-smoke.mjs --app $APP --env $DEPLOY_ENV --provider $DEPLOY_PROVIDER
  environment: { name: $DEPLOY_ENV/$APP, action: verify }
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "web"

.app-deploy-staging:
  extends: .app-deploy
  stage: deploy-staging
  variables: { DEPLOY_ENV: staging }
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true

.app-deploy-prod:
  extends: .app-deploy
  stage: deploy-prod
  variables: { DEPLOY_ENV: prod }
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true

.app-rollback:
  extends: .app-aws
  stage: rollback
  resource_group: manifest-$DEPLOY_ENV
  script:
    - node tools/ci/rollback-app.mjs --app $APP --env $DEPLOY_ENV --provider $DEPLOY_PROVIDER ${ROLLBACK_TO:+--to $ROLLBACK_TO}
  environment: { name: $DEPLOY_ENV/$APP }
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
      when: manual
      allow_failure: true
```
Each app's own `.gitlab-ci.yml` is written by the generator (see generator.md) and only names jobs that extend these templates.

## `tools/ci/generate-pipeline.mjs`
```js
#!/usr/bin/env node
/**
 * @file Prints the child pipeline YAML (ADR-0008). Which apps run:
 *   APP=<name>                                   → just that app (independent build/deploy)
 *   FULL_BUILD=true or design-system bump        → every app (Nx cannot see the runtime singleton, ADR-0001)
 *   otherwise                                    → `nx show projects --affected --type=app`
 */
import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const DESIGN_SYSTEM = /^[+-].*"@org\/design-(system|tokens)"/m; // adjust to your package names
const sh = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const hasPipeline = (app) => existsSync(`apps/${app}/.gitlab-ci.yml`);
const allApps = readdirSync('apps').filter(hasPipeline);

function designSystemBumped() {
  const base = process.env.NX_BASE;
  if (!base) return false;
  try { return DESIGN_SYSTEM.test(sh(`git diff ${base} ${process.env.NX_HEAD ?? 'HEAD'} -- package.json`)); } catch { return false; }
}

let apps;
let reason;
if (process.env.APP) {
  if (!hasPipeline(process.env.APP)) throw new Error(`Unknown app "${process.env.APP}". Known: ${allApps.join(', ')}`);
  apps = [process.env.APP];
  reason = `APP=${process.env.APP}`;
} else if (process.env.FULL_BUILD === 'true' || designSystemBumped()) {
  apps = allApps;
  reason = process.env.FULL_BUILD === 'true' ? 'FULL_BUILD=true' : 'design-system version changed: all apps';
} else {
  const base = process.env.NX_BASE ?? 'HEAD~1';
  const head = process.env.NX_HEAD ?? 'HEAD';
  apps = JSON.parse(sh(`npx nx show projects --affected --type=app --base=${base} --head=${head} --json`)).filter(hasPipeline);
  reason = `affected between ${base.slice(0, 8)} and ${head.slice(0, 8)}`;
}

const lines = [`# Generated by tools/ci/generate-pipeline.mjs. Reason: ${reason}`, 'include:', '  - local: ci/templates/app.gitlab-ci.yml'];
for (const app of apps.sort()) lines.push(`  - local: apps/${app}/.gitlab-ci.yml`);
if (!apps.length) lines.push('', 'no-apps-affected:', '  stage: verify', '  image: alpine:3', "  script: ['echo No app is affected by this change.']");
console.log(lines.join('\n'));
console.error(`[plan] ${apps.length} app(s): ${apps.join(', ') || 'none'} (${reason})`);
```
A change to `libs/mf-manifest/src/shared.config.js` must also rebuild all apps: it is in `sharedGlobals` (nx.json), so `affected` already selects every project.

## `tools/ci/lib/args.mjs`
```js
/** @file Tiny `--key value` parser for the CI scripts (no dependency). */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      out[key] = next && !next.startsWith('--') ? (i++, next) : true;
    }
  }
  return out;
}
export function required(args, ...keys) {
  for (const k of keys) if (!args[k]) throw new Error(`Missing --${k}`);
}
export const ENVS = ['dev', 'staging', 'prod'];
```

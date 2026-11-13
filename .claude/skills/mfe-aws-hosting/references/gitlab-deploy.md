# GitLab CI → S3 deploy mechanics

## OIDC: no static AWS keys
GitLab issues an ID token per job; AWS exchanges it for a short-lived role session. The job templates (`../mfe-shell-setup/references/ci-pipeline.md`) do this in `.aws-oidc` + `.aws-assume`:
```yaml
.aws-oidc:
  id_tokens:
    AWS_ID_TOKEN:
      aud: $GITLAB_OIDC_AUD               # https://gitlab.<company>.com
.aws-assume:
  script:
    - echo "$AWS_ID_TOKEN" > "$CI_PROJECT_DIR/.aws-web-identity"
    - export AWS_WEB_IDENTITY_TOKEN_FILE="$CI_PROJECT_DIR/.aws-web-identity"   # AWS CLI assumes $AWS_ROLE_ARN itself
    - export AWS_ROLE_SESSION_NAME="gl-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"
    - aws sts get-caller-identity
```
`AWS_ROLE_ARN`, `DEPLOY_BUCKET`, `PUBLIC_BASE_URL` are **environment-scoped** CI/CD variables (`dev/*`, `staging/*`, `prod/*`), selected by each job's `environment: name: $DEPLOY_ENV/$APP`. Prod-scoped values are protected; `prod/*` environments require approval. The IAM side (OIDC provider, trust policy on the `sub` claim) is in `aws-requirements.md` §5.

Trust policy example (one role per app per environment):
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<acct>:oidc-provider/gitlab.<company>.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": { "gitlab.<company>.com:aud": "https://gitlab.<company>.com" },
      "StringLike": { "gitlab.<company>.com:sub": "project_path:<group>/<repo>:ref_type:branch:ref:main" }
    }
  }]
}
```
Permission policy example for a remote (`mfe-<app>`):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    { "Sid": "OwnPrefix", "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": ["arn:aws:s3:::<bucket>/mfe/mfe-<app>/*", "arn:aws:s3:::<bucket>/_deploy/releases/mfe-<app>.json"] },
    { "Sid": "Manifest", "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"], "Resource": "arn:aws:s3:::<bucket>/mf-manifest.json" },
    { "Sid": "List", "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::<bucket>",
      "Condition": { "StringLike": { "s3:prefix": ["mfe/mfe-<app>/*"] } } }
  ]
}
```
The shell role additionally writes root objects (`index.html`, hashed shell files), `shell/*`, `app-config.json`, `_deploy/releases/shell.json`, and reads `shell/*` (copy to root). Root objects cannot be prefix-scoped, so restrict the shell role to its project and protected branch.

## Shipping the deploy scripts to other repos
External repos (the legacy app, external same-framework remotes) need `deploy-app`, `rollback-app` and `contract-smoke` without copying them. Publish `tools/ci` from the shell repo as a package to the GitLab npm registry:
```json
{
  "name": "@platform/deploy-tools",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "platform-deploy": "./deploy-app.mjs",
    "platform-rollback": "./rollback-app.mjs",
    "platform-smoke": "./contract-smoke.mjs"
  },
  "files": ["*.mjs", "lib/*.mjs"]
}
```
Bump its version on every change; consumers pin it.

## `ci/templates/remote-deploy.gitlab-ci.yml` (in the shell repo, included by other repos)
```yaml
# Deploy jobs for a remote that lives in ANOTHER repository (ADR-0008, ADR-0020).
# The consuming repo provides a job named `build` that leaves the federation build in $BUILD_DIR as an artifact.
variables:
  DEPLOY_PROVIDER: s3
  DEPLOY_TOOLS: "@platform/deploy-tools@1.0.0"
  SMOKE_FLAGS: ""                      # e.g. "--expect-shared-empty" for an isolated legacy remote

stages: [build, deploy-dev, smoke-dev, deploy-staging, deploy-prod, rollback]

.remote-aws:
  image: <node-22 image with AWS CLI v2>
  id_tokens:
    AWS_ID_TOKEN: { aud: $GITLAB_OIDC_AUD }
  before_script:
    - echo "@platform:registry=${CI_API_V4_URL}/packages/npm/" > .npmrc   # or the group-level registry URL
    - echo "${CI_API_V4_URL#https:}/packages/npm/:_authToken=${CI_JOB_TOKEN}" >> .npmrc
    - echo "$AWS_ID_TOKEN" > "$CI_PROJECT_DIR/.aws-web-identity"
    - export AWS_WEB_IDENTITY_TOKEN_FILE="$CI_PROJECT_DIR/.aws-web-identity" AWS_ROLE_SESSION_NAME="gl-${CI_PROJECT_ID}-${CI_PIPELINE_ID}"

.remote-deploy:
  extends: .remote-aws
  needs: [build]
  resource_group: manifest-$DEPLOY_ENV
  script:
    - npx -y -p $DEPLOY_TOOLS platform-deploy --app $APP --env $DEPLOY_ENV --version $CI_COMMIT_SHORT_SHA --dir $BUILD_DIR --provider $DEPLOY_PROVIDER
  environment: { name: $DEPLOY_ENV/$APP, url: $PUBLIC_BASE_URL }

deploy:dev:
  extends: .remote-deploy
  stage: deploy-dev
  variables: { DEPLOY_ENV: dev }
  rules: [{ if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH }]

smoke:dev:
  extends: .remote-aws
  stage: smoke-dev
  needs: [deploy:dev]
  variables: { DEPLOY_ENV: dev }
  script:
    - npx -y -p $DEPLOY_TOOLS platform-smoke --app $APP --env dev --provider $DEPLOY_PROVIDER $SMOKE_FLAGS
  environment: { name: dev/$APP, action: verify }
  rules: [{ if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH }]

deploy:staging:
  extends: .remote-deploy
  stage: deploy-staging
  needs: [build, smoke:dev]
  variables: { DEPLOY_ENV: staging }
  rules: [{ if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH, when: manual, allow_failure: true }]

deploy:prod:
  extends: .remote-deploy
  stage: deploy-prod
  needs: [build, deploy:staging]
  variables: { DEPLOY_ENV: prod }
  rules: [{ if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH, when: manual, allow_failure: true }]

rollback:prod:
  extends: .remote-aws
  stage: rollback
  needs: []
  resource_group: manifest-prod
  variables: { DEPLOY_ENV: prod }
  script:
    - npx -y -p $DEPLOY_TOOLS platform-rollback --app $APP --env prod --provider $DEPLOY_PROVIDER ${ROLLBACK_TO:+--to $ROLLBACK_TO}
  environment: { name: prod/$APP }
  rules: [{ if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH, when: manual, allow_failure: true }]
```
The registry auth line depends on your GitLab setup (instance vs group registry, token scope); the job token must be allowed to read the shell project's packages (CI/CD → Job token permissions).

`resource_group` serialises only within one project. Across repos, the conditional manifest write (`If-Match` ETag, retry on 412) in `lib/storage.mjs` prevents lost updates.

## Consuming it (legacy repo `.gitlab-ci.yml`)
```yaml
include:
  - project: <group>/platform-shell
    ref: ci-v1.0.0                 # a tag; never a branch
    file: ci/templates/remote-deploy.gitlab-ci.yml

variables:
  APP: mfe-legacy
  BUILD_DIR: dist/legacy-mfe/browser
  SMOKE_FLAGS: "--expect-shared-empty"   # isolated legacy remote shares nothing

build:
  stage: build
  image: node:22-bookworm
  script:
    - npm ci
    - npx ng lint && npx ng test --watch=false
    - npx ng run legacy:federation:production
  artifacts: { paths: [dist/legacy-mfe/], expire_in: 30 days }
```
dev and prod both use this one production build. An isolated legacy app has no mock flavour unless it already had one.

## Promotion
Default: build once in the pipeline and deploy the **same artifact** to staging and prod (the jobs above). Alternative, if prod sits in another account and must not receive CI uploads directly: copy the version folder bucket-to-bucket (`aws s3 sync s3://<staging-bucket>/mfe/<app>/<ver>/ s3://<prod-bucket>/mfe/<app>/<ver>/`, run by a promotion role), then write the prod manifest entry. Never rebuild for prod.

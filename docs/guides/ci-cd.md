# CI/CD (GitLab)

See ADR-0009 for the reasoning behind this setup.

```
root pipeline
 ├─ verify   workspace:checks   shared-config drift · layout no-fork check (case + 360) · file headers · lint+test affected libs
 ├─ plan     plan:apps          tools/ci/generate-pipeline.mjs → apps-pipeline.yml
 ├─ apps     child pipeline     include: ci/templates/app.gitlab-ci.yml + apps/<app>/.gitlab-ci.yml (per selected app)
 │            <app>:lint · <app>:test · <app>:build (prod + mock + no-mocks scan)
 │            <app>:deploy:dev → <app>:smoke:dev → <app>:deploy:staging (manual) → <app>:deploy:prod (manual)
 │            <app>:rollback:prod (manual)
 └─ e2e      e2e:composed       Playwright, nightly schedule + manual on main
```

## Which apps run
| Trigger | Apps |
| --- | --- |
| Merge request or push to `main` | `nx show projects --affected --type=app` |
| `package.json` changes an `@org/design-*` version | **all** (ADR-0001) |
| Run pipeline with `FULL_BUILD=true` | all |
| Run pipeline with **`APP=mfe-fraud`** | **only mfe-fraud**: independent build and deploy |

## Independent build without CI
```bash
nx build mfe-fraud                    # production → dist/apps/mfe-fraud
nx build mfe-fraud -c mock            # dev flavour → dist/apps-mock/mfe-fraud
node tools/scripts/check-no-mocks-in-prod.mjs dist/apps/mfe-fraud
```
Each app builds with only its own dependency graph. No other app is needed to build it.

## CI/CD variables (Settings → CI/CD → Variables)
| Variable | Purpose |
| --- | --- |
| `DEPLOY_PROVIDER` | `s3` (default in the templates) or `local` |
| `DEPLOY_BUCKET` | Bucket name, holds `<env>/…` prefixes |
| `PUBLIC_BASE_URL_DEV` / `_STAGING` / `_PROD` | CDN origin per environment (empty means same origin as the shell) |
| `AWS_*` | Credentials. Prefer GitLab OIDC → IAM role over static keys. |

Protect the `staging/*` and `prod/*` environments (Settings → CI/CD → Protected environments) so only release managers can run those jobs.

## Dry run everything locally
```bash
nx run-many -t build -c mock --projects=tag:type:app
for a in shell mfe-fraud mfe-cap-audit-trail; do node tools/ci/deploy-app.mjs --app $a --env dev --version local1 --provider local; done
node tools/ci/contract-smoke.mjs --app mfe-fraud --env dev --provider local
node tools/ci/serve-env.mjs dev 8080          # http://localhost:8080 is the "dev environment"
BASE_URL=http://localhost:8080 PW_CHANNEL=chrome npx playwright test -c apps/shell-e2e/playwright.config.ts
```

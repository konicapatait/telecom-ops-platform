---
name: mfe-aws-hosting
description: Hosting a micro-frontend platform (shell + remotes + isolated legacy remote) on private Amazon S3 behind CloudFront, deployed per app from GitLab CI with OIDC roles, released and rolled back by rewriting one manifest entry. It lists every AWS resource the infra team must provision (S3, CloudFront, OAC, CloudFront Functions, cache and response-header policies, WAF, ACM, Route 53, IAM/OIDC, logging, alarms), plus the bucket layout, cache rules and CSP, and includes the complete deploy/rollback/smoke scripts and the GitLab templates for other repos. Use when writing AWS requirements, reviewing infra, wiring deploy jobs, or debugging stale versions, 403/404s, MIME or CORS problems on S3/CloudFront.
---

# S3 + CloudFront hosting

Static front end with no servers of its own. One CloudFront distribution and one domain per environment, in front of one private bucket per environment and the existing backend at `/api`. Same origin for everything, so no CORS and one Okta redirect domain (ADR-0019).

Fill every `<placeholder>` (accounts, region, domains, bucket and role names, Okta domain, backend origin, GitLab paths) from `docs/migration/project-profile.md`. Ask the user for missing values and record them. Take the backend origin and current API base URLs from `docs/migration/legacy-inventory.md`.

| Reference | Contents |
| --- | --- |
| `references/aws-requirements.md` | the full resource list for the infra team, with settings and acceptance checks |
| `references/deploy-scripts.md` | `lib/storage.mjs` (local + S3, conditional writes), `deploy-app.mjs`, `rollback-app.mjs`, `contract-smoke.mjs`, `serve-env.mjs`, dry-run procedure |
| `references/gitlab-deploy.md` | GitLab OIDC, IAM trust/permission policy examples, `@platform/deploy-tools` package, `remote-deploy.gitlab-ci.yml` for other repos, promotion |

## Bucket layout (per environment: `s3://<org>-<product>-web-<env>`)
```
index.html                     live shell entry           Cache-Control: no-cache
main-*.js, chunk-*.js, *.css   live shell files (hashed)  public, max-age=31536000, immutable
mf-manifest.json               live remote manifest       no-cache   ← release / rollback = rewrite one key
app-config.json                runtime config             no-cache
shell/<version>/…              every shell build          immutable  (rollback source)
mfe/<app>/<version>/…          every remote build         immutable  (remoteEntry.json too: the folder is unique)
_deploy/releases/<app>.json    deploy history per app     never served (denied to CloudFront)
```
The shell deploy uploads `shell/<version>/` and copies it to the root. Manifest values are URLs `https://<env-domain>/mfe/<app>/<version>/remoteEntry.json` (or root-relative `/mfe/...` when same-origin).

## CloudFront behaviours (in precedence order)
| Path | Origin | Cache policy | Other |
| --- | --- | --- | --- |
| `/api/*` | backend (ALB / API Gateway / VPC origin) | `CachingDisabled` | origin request policy `AllViewerExceptHostHeader`; `Authorization` must reach the origin; all methods; origin-verify header or VPC origin |
| `/_deploy/*` | S3 | – | CloudFront Function returns 403 (bucket policy also denies) |
| `/mf-manifest.json`, `/app-config.json` | S3 (OAC) | `CachingDisabled` | – |
| `/mfe/*`, `/shell/*` | S3 (OAC) | `CachingOptimized` | compression on |
| `/*` (default) | S3 (OAC) | `UseOriginCacheControlHeaders` | viewer-request **SPA rewrite** function; response headers policy |

SPA rewrite (CloudFront Functions, JS runtime 2.0, default behaviour only). Do **not** use custom error responses that map 403/404 to `index.html`: a missing chunk would come back as HTML and hide the real failure (`MODULE_IMPORT_FAILED` instead of a clear 404).
```js
function handler(event) {
  var req = event.request;
  var last = req.uri.substring(req.uri.lastIndexOf('/') + 1);
  if (last.indexOf('.') === -1) req.uri = '/index.html'; // deep links like /orders/123
  return req;
}
```
```js
// deny-internal: viewer-request on /_deploy/*
function handler() {
  return { statusCode: 403, statusDescription: 'Forbidden' };
}
```
The behaviour is chosen before the function runs, so a rewritten deep link is cached by the default policy. That is why `index.html` must carry `Cache-Control: no-cache` as object metadata (the upload script sets it).

## Security headers (response headers policy on the default and S3 behaviours)
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
- CSP, starting point (roll out as `Content-Security-Policy-Report-Only` first):
  `default-src 'self'; script-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://<org>.okta.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'`
  Native Federation loads modules through es-module-shims (shim mode), which may need `blob:` and possibly `'wasm-unsafe-eval'` in `script-src`. Angular injects component styles inline, so static hosting needs `'unsafe-inline'` in `style-src`. Confirm in Report-Only before enforcing.

## Release flow (per app, from its own pipeline)
1. Build once: the `production` artifact (staging, prod) and the `mock` artifact (dev; isolated legacy remotes use production everywhere). Scan prod for mocks.
2. `deploy-app.mjs` uploads `mfe/<app>/<CI_COMMIT_SHORT_SHA>/` with immutable cache headers.
3. It rewrites **one** manifest key with an S3 conditional write (`If-Match` ETag, retry on 412). Within one repo, GitLab `resource_group: manifest-<env>` also serialises.
4. It appends to `_deploy/releases/<app>.json` (version, url, previous, at, by, pipeline).
5. `contract-smoke.mjs` fetches `remoteEntry.json` through CloudFront and checks name, exposes and shared versions (`--expect-shared-empty` for the legacy remote).
6. No CloudFront invalidation is needed: root files are not cached. Optionally invalidate `/index.html /mf-manifest.json /app-config.json` after a shell deploy as a safety net.

**Shell**: upload `shell/<ver>/`, copy to root (S3→S3 copy keeps metadata), upload `app-config.json`, seed the manifest only if absent (`If-None-Match: *`).
**Rollback**: `rollback-app.mjs` points the key back to the previous (or `--to`) version from the history (shell: re-copy `shell/<prev>/` to root). No rebuild; users get it on their next page load.
**Promotion**: the same pipeline artifact goes to staging and prod; environment differences live only in `app-config.json`.

## Verify after provisioning (dev first)
```bash
D=https://<env-domain>
curl -sI $D/ | grep -iE 'cache-control|strict-transport|content-security'
curl -sI $D/orders/123                                   # 200 text/html (rewrite), not 403
curl -sI $D/mfe/<app>/<ver>/remoteEntry.json             # 200, immutable, application/json
curl -sI $D/mfe/<app>/<ver>/chunk-missing.js             # 403/404, NOT index.html
curl -sI $D/mfe/<app>/<ver>/<some>.js | grep -i content-type   # text/javascript or application/javascript
curl -sI $D/mf-manifest.json                             # no-cache
curl -sI $D/_deploy/releases/shell.json                  # 403
curl -sI https://<bucket>.s3.<region>.amazonaws.com/index.html   # 403 (bucket private)
```
Then run the shell E2E against the environment (`BASE_URL=$D`), deploy a remote, roll it back, and confirm the change appears on the next page load without an invalidation.

## Troubleshooting
| Symptom | Likely cause |
| --- | --- |
| Section "unavailable", code `REMOTE_ENTRY_UNREACHABLE` | manifest URL wrong, object missing, OAC/bucket policy denies, WAF block |
| `MODULE_IMPORT_FAILED` after a release | a shared version differs (contract smoke should catch it), a stale cached root file, or a chunk served as `text/html` |
| Old version keeps showing | root file cached: check the `Cache-Control` metadata on `index.html` / `mf-manifest.json` and the behaviour's cache policy |
| `Failed to load module script: … MIME type` | object uploaded with the wrong `Content-Type` (e.g. `.mjs` as `binary/octet-stream`); re-upload with `--content-type text/javascript` |
| CORS error on `remoteEntry.json` | the remote is served from another domain; keep everything on one distribution, or add a CORS response headers policy |
| 403 on a deep link | the SPA rewrite function is not attached to the default behaviour |
| Manifest update lost | a writer without `If-Match`; use only the deploy/rollback scripts |

# AWS resource requirements

Hand this to the cloud/infra team. One set per environment (dev, staging, prod) unless marked global. Values in `<>` are to be agreed.

## 0. Inputs the infra team needs from us
| Item | Example |
| --- | --- |
| Environments and AWS accounts | dev `<acct>`, staging `<acct>`, prod `<acct>` (separate accounts recommended) |
| Domains | `app.dev.<domain>`, `app.staging.<domain>`, `app.<domain>` |
| Backend origin per env | ALB / API Gateway hostname, or private ALB (VPC origin) |
| GitLab instance + project paths | `gitlab.<company>.com`, `platform/platform-shell`, `<group>/<legacy-app>` |
| Remote names | `shell`, `mfe-<legacy>`, `mfe-<domain>`, … (each gets its own deploy role/prefix) |
| Okta org domain (for CSP) | `<org>.okta.com` |
| Region for the bucket | `<region>` (CloudFront, ACM and WAF for CloudFront are in `us-east-1`) |

## 1. DNS and TLS
| Resource | Requirement |
| --- | --- |
| Route 53 hosted zone (or corporate DNS) | Alias A + AAAA records `app.<env>.<domain>` → distribution |
| ACM certificate | **us-east-1**, DNS-validated, covers the env domain; auto-renewal monitored |

## 2. S3 (one bucket per environment)
| Setting | Requirement |
| --- | --- |
| Name | `<org>-<product>-web-<env>` |
| Block Public Access | all four ON (account and bucket) |
| Object Ownership | Bucket owner enforced (ACLs disabled) |
| Encryption | SSE-S3 (simplest). If SSE-KMS: key policy grants `cloudfront.amazonaws.com` `kms:Decrypt` with `AWS:SourceArn` = distribution ARN |
| Versioning | ON (protects `mf-manifest.json`, `app-config.json`, `index.html` against bad writes; audit) |
| Bucket policy | (a) allow `s3:GetObject` to `cloudfront.amazonaws.com` with `AWS:SourceArn` = this env's distribution; (b) explicit deny of that read on `_deploy/*`; (c) deny any request with `aws:SecureTransport = false` |
| Lifecycle | expire noncurrent object versions after `<30>` days; keep version folders `mfe/*/<ver>/` and `shell/<ver>/` for at least `<90>` days (rollback window), or prune by a scheduled job that keeps the last N per app |
| CORS | none needed (same origin). Dev only, optional: allow `http://localhost:4200` GET if developers run a local shell against dev remotes (better via a response headers policy on the distribution) |
| Logging | server access logs off (CloudFront logs cover it) unless security requires them |
| Tags | `product`, `env`, `owner`, `cost-center` |

## 3. CloudFront (one distribution per environment)
| Setting | Requirement |
| --- | --- |
| Alternate domain + certificate | env domain, ACM cert from §1, security policy `TLSv1.2_2021`, SNI |
| HTTP | redirect HTTP → HTTPS; HTTP/2 and HTTP/3 on; IPv6 on |
| Default root object | `index.html` |
| Origins | (1) S3 bucket REST endpoint with **Origin Access Control** (sign always, SigV4); (2) backend: HTTPS only, plus secret `X-Origin-Verify` header checked by the ALB/API (rotated), or a **VPC origin** for a private ALB |
| Behaviours | as in SKILL.md: `/api/*`, `/_deploy/*`, `/mf-manifest.json`, `/app-config.json`, `/mfe/*`, `/shell/*`, default `/*` |
| Cache policies | managed `CachingDisabled` (api, manifest, app-config), `CachingOptimized` (mfe, shell), `UseOriginCacheControlHeaders` (default) |
| Origin request policy | `AllViewerExceptHostHeader` on `/api/*`; confirm the `Authorization` header and cookies (if any) reach the backend |
| Allowed methods | GET/HEAD/OPTIONS for S3 behaviours; all methods for `/api/*` |
| Compression | ON (gzip + brotli) |
| CloudFront Function `spa-rewrite` | viewer-request on default behaviour: extension-less URI → `/index.html` |
| CloudFront Function `deny-internal` | viewer-request on `/_deploy/*`: return 403 |
| Custom error responses | **none** for 403/404 (never map them to `index.html`); optional friendly 5xx page for the API |
| Response headers policy | HSTS, `X-Content-Type-Options`, `Referrer-Policy`, frame options, CSP (Report-Only first; see SKILL.md); attached to the default and S3 behaviours |
| Price class | `<PriceClass_100 or All>` per user geography |
| Geo restriction | `<none / allowlist>` per policy |
| Logging | standard logging (v2) to CloudWatch Logs or an S3 log bucket, retention `<90>` days; real-time logs optional |
| WAF | web ACL from §4 attached |
| Tags | as above |

## 4. AWS WAF (scope CLOUDFRONT, us-east-1)
| Rule | Notes |
| --- | --- |
| `AWSManagedRulesCommonRuleSet` | watch `SizeRestrictions_BODY` on `/api/*` uploads; scope-down or override to count if it blocks legitimate uploads |
| `AWSManagedRulesKnownBadInputsRuleSet` | – |
| `AWSManagedRulesAmazonIpReputationList` | – |
| Rate-based rule | e.g. `<2000>` requests / 5 min per IP on `/api/*` |
| Non-prod allowlist | dev/staging: allow only corporate egress IPs / VPN (`<CIDRs>`) |
| Logging | WAF logs to CloudWatch Logs / S3 (`aws-waf-logs-*`), retention `<90>` days |

## 5. IAM and GitLab OIDC
| Resource | Requirement |
| --- | --- |
| IAM OIDC identity provider | URL `https://gitlab.<company>.com`, audience `https://gitlab.<company>.com` (one per account) |
| Role `deploy-shell-<env>` | trust: `sub` like `project_path:platform/platform-shell:ref_type:branch:ref:main`; permissions: `s3:PutObject/GetObject` on root objects, `shell/*`, `app-config.json`, `mf-manifest.json`, `_deploy/releases/shell.json`; `s3:ListBucket` (prefix `shell/`); optional `cloudfront:CreateInvalidation` on the distribution |
| Role `deploy-<app>-<env>` (one per remote, incl. `mfe-<legacy>`) | trust: that project's path on `main`; permissions: `s3:PutObject/GetObject` on `mfe/<app>/*` and `_deploy/releases/<app>.json`; `s3:GetObject/PutObject` on `mf-manifest.json`; `s3:ListBucket` with `s3:prefix` `mfe/<app>/*` |
| Promotion role (staging → prod copy) | read on the staging bucket `mfe/*`, `shell/*`; write as the per-app prod roles (or reuse them with cross-account read on staging) |
| Session | max 1 h; role session name includes the GitLab project and pipeline id (CloudTrail traceability) |
| Prod guard | prod roles only trusted from protected branches; GitLab protected environments + manual approval on the prod jobs |
| Note | IAM cannot restrict a writer to **one key inside** `mf-manifest.json`. Default: the deploy script only edits its own key, conditional writes prevent lost updates, bucket versioning allows restore. Strict option: a small "manifest writer" Lambda (invoked with the caller's role) that validates the caller only changes its own key. |

## 6. Monitoring and audit
| Item | Requirement |
| --- | --- |
| CloudWatch alarms | distribution `5xxErrorRate` > `<1%>` for 5 min; `4xxErrorRate` spike; origin latency on `/api/*`; WAF blocked-request spike |
| Notifications | SNS topic → team channel / on-call |
| CloudTrail | data events on the web bucket for `PutObject` on `mf-manifest.json`, `app-config.json`, `index.html` (who released what) |
| Front-end telemetry | the shell posts warn/error logs to `/api/telemetry/logs` (backend) or use CloudWatch RUM `<optional>` (adds a CSP `connect-src` entry) |
| Budgets | AWS Budget alarm per account `<amount>` |

## 7. Backend requirements (not AWS-specific)
- Reachable as `/api/*` on the same CloudFront domain; accepts Okta access tokens (issuer + audience) and answers 401/403 correctly.
- `/api/me/entitlements` (or token claims) returns the entitlement list.
- Does not rely on the `Host` header being its own hostname (or uses `AllViewerExceptHostHeader`).
- `X-Correlation-Id` logged end to end.

## 8. Acceptance checks for the infra hand-over
Run the `curl` list in SKILL.md "Verify after provisioning", then: deploy a remote from GitLab via OIDC (no static keys), roll it back, promote one version staging → prod, and confirm CloudTrail shows each manifest write with the pipeline's session name.

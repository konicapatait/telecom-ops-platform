# Pharos micro-frontend migration plan

Oct 25, 2026 · @Konica

Recommendation: put a new thin shell in front of Pharos, run Pharos almost unchanged as one isolated micro-frontend, and build Pharos 2.0 as new domain and capability micro-frontends on the new design library, all served from one CloudFront domain backed by private S3.

## Executive summary

Pharos becomes one micro-frontend in the new platform with almost no code change. All new work ships as Pharos 2.0 micro-frontends on the new design library, and users see one application on one URL.

- **What we build.**
  - A thin **shell** that owns sign-in (Okta), the header and navigation, and loading of micro-frontends.
  - **Pharos (legacy)**, wrapped as an *isolated* micro-frontend: it keeps its own Angular version, design library, role logic and screens.
  - **Pharos 2.0** domain micro-frontends for new screens, plus **capability** micro-frontends (for example notes, attachments, audit history) that any screen can embed.
- **What changes in Pharos.**
  - A small adapter: a federation build target, a mount entry point, a route base path, and Okta redirect settings.
  - No business screens, services or role rules are rewritten.
- **How it is hosted.**
  - One CloudFront distribution serves the shell, each micro-frontend from its own versioned S3 folder, and `/api` from the existing backend.
  - Releasing or rolling back one micro-frontend means editing one line in a manifest. No other app is rebuilt.
- **Why.**
  - Teams ship Pharos 2.0 features independently and adopt the new design library without a big-bang rewrite.
  - Pharos screens are retired one at a time (the strangler pattern).
- **What it costs.**
  - A platform team to own the shell, shared contracts and pipelines.
  - Two design libraries on screen during the transition.
  - More runtime moving parts to monitor.

## Starting point and constraints

Pharos is an Angular modular monolith for case management. Four of its capabilities must keep working through the whole migration.

| Capability today | How it must behave after the move |
| --- | --- |
| Login through Okta | One sign-in for the whole application. Users never log in twice when they move between Pharos and Pharos 2.0 |
| Access-based route access | Users see and open only the sections and routes their roles allow, in old and new screens alike |
| Role-driven field values | Fields show, hide, mask or lock their values by role. Existing Pharos rules stay as they are |
| Access-based component loading | A component, or a capability micro-frontend, is not even downloaded unless the user may use it |

Rules this plan respects:

1. **Minimal change to Pharos.** No rewrite of screens, services or role logic, only a thin integration adapter.
2. **Pharos 2.0 uses the new design library** and does not depend on the old one.
3. **Capability micro-frontends** can be embedded in Pharos 2.0 screens, and later in Pharos if wanted.
4. **Hosting is S3 behind CloudFront.** The front end needs no servers of its own.
5. **Security stays in the backend.** The front end hides what a user may not use, and the API refuses it.

## Options compared

Option C is recommended: a new shell with Pharos as an isolated micro-frontend. It is the only option that keeps Pharos almost untouched and still gives one seamless application. Option B is a safe first release while C is built.

|  | A. Pharos becomes the shell | B. Two apps, split by URL path | **C. New shell, Pharos as isolated MFE (recommended)** | D. Pharos inside an iframe |
| --- | --- | --- | --- | --- |
| How it works | Pharos hosts and loads Pharos 2.0 remotes | CloudFront sends `/legacy/*` to Pharos and everything else to Pharos 2.0; no runtime composition | Thin shell loads Pharos as a remote that runs its own Angular copy, mounted as a web component | Shell shows Pharos in a frame |
| Change to Pharos | Medium to high: host config, new chrome, design library mixing in Pharos code | Very low: base path and Okta redirect URIs | Low: federation target, mount entry, base path, auth adapter | Very low |
| User experience | Seamless | Full page reload when crossing between old and new; two headers | Seamless; one header and navigation | Frame scrolling, focus and deep-link problems; two headers unless hidden |
| One sign-in | Yes | Yes, if both use the same Okta app on one domain | Yes, shell owns Okta | Needs token hand-off into the frame |
| Shared context (selected case, events) | Yes | No, only through the URL | Yes, through a small contract | Only through `postMessage` |
| Design libraries | Mixed inside one runtime, high clash risk | Fully separate | Separate runtimes; old library scoped to the Pharos mount | Fully separate |
| Long-term fit | Poor: the legacy app owns the platform forever | Fair as a stepping stone | Good: Pharos shrinks screen by screen, then is removed | Poor |
| Verdict | Rejected | Use as Phase 1 fallback | **Chosen** | Rejected |

Later, Pharos could become a fully shared remote (one Angular copy for all), but only after it is upgraded to the Angular version Pharos 2.0 uses. That is an optional Phase 4, not a precondition.

## Target architecture

&#91;embedded content: target architecture · CloudFront, S3, API, shell and micro-frontends\]

CloudFront sends `/api/*` to the backend and everything else to the private bucket. The shell loads Pharos and the Pharos 2.0 micro-frontends from version folders listed in the manifest. Pharos keeps its own runtime and joins the shared services only through a small adapter.

## Component placement

The shell owns what must exist exactly once per page. Each micro-frontend owns what belongs to its business area. Shared libraries hold only contracts, never screens.

| Component | Lives in | Why there |
| --- | --- | --- |
| Okta sign-in, callback, token refresh, sign-out | Shell | One session for every micro-frontend; nothing else talks to Okta |
| Header, navigation, user menu, not-found page | Shell (new design library) | One consistent frame around old and new screens |
| Top-level route access (which sections a user sees) | Shell route registry + entitlements service | The shell decides whether to load a micro-frontend at all |
| Routes and guards inside a section | Each micro-frontend | The owning team knows its own rules |
| Entitlements and roles service | Shared contracts library, one instance provided by the shell | Every MFE reads the same roles; loaded once after sign-in |
| Role-driven field values (show, mask, lock) | Inside each MFE, using a shared directive in Pharos 2.0 | The field rules belong with the form; Pharos keeps its own |
| Access-based component loading | Pharos 2.0 capability host | Loads a capability MFE only when the user's role allows it |
| Existing case screens and logic | Pharos (legacy) MFE | Unchanged, with its old design library and Angular version |
| New case screens | Pharos 2.0 domain MFEs | New design library, independent releases |
| Reusable widgets (notes, attachments, audit history, search) | Capability MFEs | Built once, embedded in many screens |
| Event bus and current-case context | Shared contracts library | The only way MFEs talk to each other |
| New design library | npm package, one shared copy for shell and Pharos 2.0 | Never forked; old library stays inside Pharos only |
| Logger, correlation id, diagnostics | Shared utilities library | One trace across every micro-frontend |
| Manifest and runtime config | S3 root, served without caching | Changing a URL or setting needs no rebuild |
| APIs | Existing backend behind `/api` on the same CloudFront domain | No CORS; the backend enforces every permission |

## Access control end to end

The shell signs the user in once and loads their roles once. Every micro-frontend reads them from the same shared service. The API remains the final check.

1. **Sign-in (shell).**
   - The shell uses Okta OIDC with PKCE and stores the session.
   - Pharos keeps its Okta SDK in Phase 1, configured with the same Okta app and domain, so it finds the existing session silently.
   - In Phase 2, a small auth adapter in Pharos reads the token from the shell instead, and its own login screen is switched off.
2. **Roles (shared service).**
   - After sign-in, the shell loads the user's roles and entitlements once, from token claims or an `/api/me` call.
   - It provides them through the shared contracts library. Pharos maps them onto its existing role service through the adapter, so its role checks keep working unchanged.
3. **Route access.**
   - *Shell level:* a navigation entry and its micro-frontend load only if the user holds that section's entitlement.
   - *Inside a micro-frontend:* route guards use the same service. Pharos keeps its current guards.
4. **Role-driven field values.**
   - Pharos keeps its current field rules.
   - Pharos 2.0 uses one shared directive or form helper (for example *hide*, *mask* or *read-only* by entitlement), so every new screen behaves the same way.
   - Values a user may not see are not sent by the API. Masking in the UI is a convenience, not a control.
5. **Access-based component loading.**
   - Each Pharos 2.0 screen lists its capability panels as configuration, each with an entitlement.
   - The capability host downloads a panel's code only if the user holds that entitlement, so users never fetch code for features they cannot use.
6. **Enforcement.**
   - Every API checks the caller's token and answers 403 when access is missing.
   - Micro-frontends show a clear "No access" state rather than an error.

## Deployment on S3 and CloudFront

Use one CloudFront distribution and one domain per environment, in front of a private S3 bucket and the existing API. One domain keeps Okta, cookies and API calls simple, and avoids cross-origin (CORS) setup between micro-frontends.

**Bucket layout.**

- **Buckets.** One private bucket per environment (dev, staging, prod). CloudFront reads it through Origin Access Control, and the bucket is never public.
- **Prefixes.**
  - `/shell/<version>/` for the shell.
  - `/mfe/pharos/<version>/` for Pharos.
  - `/mfe/<pharos2-domain>/<version>/` for each Pharos 2.0 domain.
  - `/mfe/cap-<name>/<version>/` for each capability.
  - `index.html`, `mf-manifest.json` and `app-config.json` at the root.
- **Pipeline permissions.** Each micro-frontend's pipeline has an IAM role that can write only its own prefix and its own line of the manifest. That is what makes deploys independent and safe.

**CloudFront behaviours.**

| Path pattern | Origin | Cache | Notes |
| --- | --- | --- | --- |
| `/api/*` | Existing backend (ALB or API Gateway) | Disabled; forward the `Authorization` header | Same origin as the UI, so no CORS |
| `/mfe/*`, `/shell/*` | S3 | One year, `immutable` | Version folders never change after upload |
| `/mf-manifest.json`, `/app-config.json`, `/index.html` | S3 | `no-cache` | Read on every page load, so a release or rollback takes effect at once |
| `/*` (default) | S3 | `no-cache` | A CloudFront Function rewrites extension-less paths (deep links such as `/cases/123`) to `/index.html` |

Prefer the CloudFront Function rewrite over custom 403/404 error pages. Error pages turn a missing JavaScript file into an HTML page, which hides real load failures.

**Security.**

- A response headers policy sets HSTS, a Content-Security-Policy that allows only this domain and the Okta domain, `X-Content-Type-Options` and a frame policy.
- AWS WAF goes in front of the distribution.
- TLS certificates come from ACM.

**Release.** The pipeline builds once, uploads the new version folder, smoke-tests its `remoteEntry`, then updates the micro-frontend's line in `mf-manifest.json`. Only the root files need a CloudFront invalidation.

**Rollback.** Point the manifest line back to the previous version folder. Nothing is rebuilt, and users get the old version on their next page load.

**Promotion.** The same build moves from dev to staging to prod by copying the version folder and updating that environment's manifest. Environment differences live only in `app-config.json`.

## Plan

&#91;embedded content: roadmap · 5 phases, each closed by a gate\]

Users get one sign-in and one domain at the end of Phase 1, before any Pharos code changes. Phase 2 is the only phase that touches Pharos, and it starts with a spike on its ten most-used screens. From Phase 3 onwards, each new Pharos 2.0 slice retires a Pharos screen through a redirect, so Pharos shrinks with every release.

## Benefits and downsides

The move pays off if several teams need to ship Pharos 2.0 features on their own schedules. If one team will do most of the work, the extra platform overhead may outweigh the gains.

| Area | Stay a modular monolith | Micro-frontends (this plan) |
| --- | --- | --- |
| Release independence | One build and one release train for everything | **Benefit:** each MFE builds, deploys and rolls back on its own |
| Risk to Pharos | Every new feature touches the monolith | **Benefit:** Pharos is frozen behind an adapter; new work lands elsewhere |
| Adopting the new design library | Gradual mixing inside one codebase | **Benefit:** clean start in Pharos 2.0. **Downside:** two visual styles until Pharos screens are replaced |
| Reuse | Shared modules within one app | **Benefit:** capability MFEs reused across screens and teams |
| Rollback | Redeploy the whole app | **Benefit:** a one-line manifest change per MFE, in seconds |
| Performance | One optimised bundle | **Downside:** Pharos loads a second Angular runtime; more requests per page until Pharos is retired |
| Complexity | Lower: one build, one runtime | **Downside:** manifest, contracts, shared-dependency rules, per-MFE pipelines |
| Debugging | One stack trace | **Downside:** needs structured logging and trace ids across MFEs |
| Team ownership | Blurry: everyone edits one repo area | **Benefit:** clear owners per MFE; a platform team owns the shell |
| Cost to start | None | **Downside:** a platform phase before the first feature ships |

## Risks and mitigations

The two biggest risks are style clashes between the two design libraries, and Pharos code assuming it owns the whole page. Both are tested in the Phase 2 spike before any feature work.

| Risk | Effect | Mitigation |
| --- | --- | --- |
| Global CSS from Pharos's old library leaks into the shell, or the other way round | Broken layout and fonts | Mount Pharos inside a Shadow DOM web component, or prefix its global styles; visual regression tests on key screens |
| Pharos assumes it owns `window`, `document.body` or the root URL | Overlays, dialogs or routing misbehave | Run Pharos under a base path; point dialogs and overlays at its mount element; spike the top 10 screens |
| Two Angular runtimes on one page | Larger download, slower first load of Pharos screens | Load Pharos lazily, only when a Pharos route is opened; set a performance budget |
| Okta session not shared | Users asked to log in twice | One Okta app and one domain; in Phase 2 Pharos takes its token from the shell |
| Role names differ between Pharos and Pharos 2.0 | Wrong access in one half | One entitlement list owned by the backend; the Pharos adapter maps old role names onto it |
| Cached `index.html` or manifest after a release | Users run a stale mix of versions | `no-cache` on root files; immutable version folders; invalidate only root files |
| Contract changes break a deployed MFE | Runtime errors in production | Contracts are additive only; contract smoke test after every deploy |
| A remote is down or slow | Blank page | Error boundary with Retry around every mount; the shell and other sections keep working |

## Assumptions and open questions

These decide details of Phases 1 and 2. Each has a working assumption until it is answered.

- [ ] **Pharos Angular version and builder.**
  - *Assumed:* new enough for Native Federation (esbuild).
  - If it is older or uses webpack, Pharos uses Webpack Module Federation, or an Angular Elements bundle loaded as a plain script.
- [ ] **Okta setup.**
  - *Assumed:* one Okta SPA app.
  - To confirm: whether Pharos stores tokens in a way the shell can share, and which redirect URIs it needs.
- [ ] **Source of roles.**
  - *Assumed:* token claims plus an `/api/me` endpoint.
  - To confirm: the exact names, and how Pharos roles map to Pharos 2.0 entitlements.
- [ ] **New design library.**
  - Its name, its framework version, and whether it is published to an internal npm registry.
- [ ] **API origin.**
  - Whether the backend can sit behind `/api` on the CloudFront domain (preferred), or needs CORS on a separate domain.
- [ ] **Environments and AWS accounts.**
  - One bucket and distribution per environment is assumed. Confirm the accounts, domains and CI/CD tool.
- [ ] **First Pharos 2.0 slice.**
  - Which screen moves first? Pick one that is valuable but has few dependencies.
- [ ] **Team size and dates.**
  - Needed to turn the phases into a dated schedule.

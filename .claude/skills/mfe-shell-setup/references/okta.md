# Okta in the shell

## Okta tenant requirements (hand to the Okta admin)
| Item | Value |
| --- | --- |
| App integration | OIDC **Single-Page Application**, one per product. Shared by the shell and, in composed mode, the legacy app |
| Grant types | Authorization Code + PKCE, Refresh Token (rotation on, grace period ≥ 30 s) |
| Sign-in redirect URIs | `https://<env-domain>/login/callback` for each environment; `http://localhost:4200/login/callback` for local |
| Sign-out redirect URIs | `https://<env-domain>/`, `http://localhost:4200/` |
| Trusted Origins | each `https://<env-domain>` and `http://localhost:4200`, type **CORS + Redirect** |
| Authorization server | custom server (e.g. `default`) whose audience is the backend API; issuer `https://<org>.okta.com/oauth2/<server>` |
| Scopes | `openid profile email offline_access` (+ API scopes if the backend checks them) |
| Claims | `groups` (filtered) or an `entitlements` claim, or (preferred) the backend serves `/api/me/entitlements` from one backend-owned list |
| Access policy | rule allowing the SPA client; token lifetimes agreed with security |
| Assignments | the groups that may use the app |
| Existing app's Okta app | either reuse its client id in the shell (extend its redirect URIs) or move both to the new client. They must share one client: see "Token storage" |

## Runtime config (per environment, no secrets: SPA + PKCE has none)
`apps/shell/config/<env>/app-config.json`
```json
{
  "environment": "dev",
  "okta": { "issuer": "https://<org>.okta.com/oauth2/default", "clientId": "<spa-client-id>", "redirectPath": "/login/callback" },
  "logEndpoint": "/api/telemetry/logs"
}
```
The shell deploy uploads it to the bucket root with caching disabled. Changing Okta settings = re-uploading this file, not rebuilding.

## Code (full source in libs.md and shell-app.md)
- `AuthService` (abstract): `user`, `isAuthenticated`, `init()`, `login(returnUrl)`, `logout()`, `getAccessToken()`. MFEs inject only this.
- `OktaAuthService`: lazy `import('@okta/okta-auth-js')`; `pkce: true`; `tokenManager.autoRenew`; `client.start()`; `init()` runs `handleLoginRedirect()` on the callback and restores the original URI set by `login()`.
- `provideAuth({ issuer, clientId, redirectUri: origin + redirectPath, postLogoutRedirectUri: origin })` in the shell's `appConfig`; mock builds add `provideMockAuth(PERSONAS)` after it.
- Routes: `login/callback` outside the chrome (shows a skeleton; the initializer does the work); `''` with `canActivate: [authGuard]` wrapping the chrome and every section.
- `authInterceptor`: Bearer only for `req.url.startsWith('/api')`, never `remoteEntry.json` or third parties.
- Keep `@okta/okta-auth-js` in the federation `skip` list: only the shell downloads it, lazily.

## Token storage
okta-auth-js keeps tokens in `localStorage` under the key `okta-token-storage` by default, **whatever the client id**. Two different Okta clients on the same origin overwrite each other's tokens. Therefore the shell and the legacy app use one client, or one of them sets a different `tokenManager.storageKey`.

## Rules
- The shell is the only Okta client that redirects or renews. Remotes call `AuthService.getAccessToken()` (shared singleton); the legacy app uses the bridge (**mfe-onboard-legacy-app**).
- Never put tokens in logs, events, URLs or `postMessage`.
- API 401 → `auth.login(currentUrl)`; 403 → explicit "No access" state (the API is the control, ADR-0015).
- Entitlements load once after sign-in; a role change takes effect on the next page load.

## CSP entries Okta needs
`connect-src 'self' https://<org>.okta.com`. Add `frame-src https://<org>.okta.com` only if you rely on iframe-based silent renew (not needed with refresh tokens).

## Checks
- Sign-in from a deep link returns to that deep link (with query).
- After access-token expiry the app keeps working without a prompt (refresh token).
- Sign-out clears the session; the next navigation goes to Okta.
- Two tabs open for an hour: no refresh-token rotation errors.

# ADR-0013: An abstract AuthService with Okta and Mock implementations, selected by DI override

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
- `AuthService` (abstract, `@platform/auth`) exposes `user` (signal), `isAuthenticated`, `init`, `login`, `logout` and `getAccessToken`. MFEs inject the abstraction only.
- `OktaAuthService` uses `@okta/okta-auth-js` (OIDC + PKCE, `autoRenew` token refresh). It **lazy-imports** the SDK, so mock builds and remotes never download it.
- `provideAuth(config)` registers Okta. In mock configurations, `start-mocks.ts` appends `provideMockAuth(PERSONAS)` **after** it, which overrides `AuthService` and adds the optional `PERSONA_SWITCHER` token the header uses.
- `authGuard` (functional) protects the shell's root route. `authInterceptor` attaches the bearer token to same-origin `/api` calls **only**, never to `remoteEntry.json` or third-party URLs.
- Entitlements (`@platform/entitlements`) are loaded once after sign-in from `/api/me/entitlements`. `entitlementGuard('fraud:view')` lives in each domain's own routes. The shell nav filters with the same entitlement from its registry.
- A persona switch reloads the page, so every guard and cached view re-evaluates, just like signing in as someone else.

## Consequences
- Real Okta has not been exercised. It needs an Okta SPA app and the `app-config.json` values (see Assumptions).

/**
 * @platform/auth-mock: secondary entry point, deliberately NOT a federation shared mapping.
 * Shared libs are bundled whole (no cross-federation tree-shaking), so mock auth lives outside
 * @platform/auth and is reachable only from start-mocks.ts, which production builds swap out (ADR-0006).
 */
export * from './mock-auth.service';

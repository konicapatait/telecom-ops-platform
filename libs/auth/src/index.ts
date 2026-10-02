/**
 * @file Public API of @platform/auth.
 */
export * from './lib/auth.service';
export * from './lib/auth.guard';
export * from './lib/auth.interceptor';
export * from './lib/provide-auth';
export * from './lib/persona-switcher';
export * from './lib/okta/okta-auth.service';
// Mock auth is a separate, unshared entry point: @platform/auth-mock (libs/auth/mock/src).

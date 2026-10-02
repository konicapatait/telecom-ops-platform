/**
 * @file Abstract AuthService: the only auth API MFEs see; the shell provides Okta or Mock (ADR-0013).
 */
import { Signal, computed } from '@angular/core';
import type { AuthUser } from '@platform/contracts';

/**
 * Abstract auth contract. The shell provides one implementation (Okta, or Mock in mock configurations);
 * MFEs inject `AuthService` and never know which.
 */
export abstract class AuthService {
  abstract readonly user: Signal<AuthUser | null>;
  readonly isAuthenticated = computed(() => this.user() !== null);

  /** Restore an existing session or complete a redirect. Called once by the shell before routing. */
  abstract init(): Promise<void>;
  abstract login(returnUrl?: string): Promise<void>;
  abstract logout(): Promise<void>;
  /** Fresh access token (refreshing if needed), or null when signed out. */
  abstract getAccessToken(): Promise<string | null>;
}

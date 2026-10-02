/**
 * @file MockAuthService + provideMockAuth: always signed in as a persona, carried to the mock API as `Bearer mock.<id>` (ADR-0006, ADR-0013).
 */
import {
  EnvironmentProviders,
  Injectable,
  InjectionToken,
  computed,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';
import type { AuthUser, Persona } from '@platform/contracts';
import { AuthService, PERSONA_SWITCHER, type PersonaSwitcher } from '@platform/auth';

export const MOCK_PERSONAS = new InjectionToken<readonly Persona[]>('MOCK_PERSONAS');
const STORAGE_KEY = 'platform.mockPersona';

/** Mock token format understood by the MSW handlers in @platform/mocks: `mock.<personaId>`. */
export function mockTokenFor(personaId: Persona['id']): string {
  return `mock.${personaId}`;
}

/**
 * Always signed in, no redirect. The active persona is remembered across reloads and is
 * carried to the mock API in the bearer token, so entitlements come from the "server" like they will in production.
 */
@Injectable()
export class MockAuthService extends AuthService implements PersonaSwitcher {
  readonly personas = inject(MOCK_PERSONAS);
  private readonly _current = signal<Persona>(this.restore());

  readonly current = this._current.asReadonly();
  readonly user = computed<AuthUser | null>(() => {
    const { userId, displayName, email } = this._current();
    return { userId, displayName, email };
  });

  async init(): Promise<void> {
    /* nothing to restore */
  }
  async login(): Promise<void> {
    /* always signed in */
  }
  async logout(): Promise<void> {
    location.assign('/');
  }
  async getAccessToken(): Promise<string> {
    return mockTokenFor(this._current().id);
  }

  switchTo(id: Persona['id']): void {
    const next = this.personas.find((p) => p.id === id);
    if (!next) return;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* storage blocked: persona just won't survive a reload */
    }
    this._current.set(next);
  }

  private restore(): Persona {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return this.personas.find((p) => p.id === saved) ?? this.personas[0];
  }
}

/** Overrides `AuthService` with the mock and exposes the persona switcher. Use only from start-mocks.ts. */
export function provideMockAuth(personas: readonly Persona[]): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: MOCK_PERSONAS, useValue: personas },
    MockAuthService,
    { provide: AuthService, useExisting: MockAuthService },
    { provide: PERSONA_SWITCHER, useExisting: MockAuthService },
  ]);
}

import { TestBed } from '@angular/core/testing';
import type { Persona } from '@platform/contracts';
import { AuthService, PERSONA_SWITCHER } from '@platform/auth';
import { MockAuthService, provideMockAuth } from './mock-auth.service';

const PERSONAS: Persona[] = [
  { id: 'analyst', label: 'Analyst', userId: 'u1', displayName: 'Ana', email: 'a@example.test', entitlements: [] },
  { id: 'auditor', label: 'Auditor', userId: 'u2', displayName: 'Aud', email: 'b@example.test', entitlements: [] },
];

describe('MockAuthService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideMockAuth(PERSONAS)] });
  });

  it('is signed in as the first persona by default', async () => {
    const auth = TestBed.inject(AuthService);
    expect(auth).toBeInstanceOf(MockAuthService);
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.user()?.displayName).toBe('Ana');
    expect(await auth.getAccessToken()).toBe('mock.analyst');
  });

  it('switches persona and remembers it', async () => {
    const switcher = TestBed.inject(PERSONA_SWITCHER);
    switcher.switchTo('auditor');
    expect(switcher.current().id).toBe('auditor');
    expect(await TestBed.inject(AuthService).getAccessToken()).toBe('mock.auditor');
    expect(localStorage.getItem('platform.mockPersona')).toBe('auditor');
  });
});

/**
 * @file Mock personas (Analyst, Supervisor, Auditor) with their entitlements, and how the mock API reads the persona from a request.
 */
import type { Persona } from '@platform/contracts';

/**
 * Mock identities. Entitlements here are what the mock `/api/me/entitlements` returns for each persona.
 * Real entitlements come from the IdP / entitlement service.
 */
export const PERSONAS: readonly Persona[] = [
  {
    id: 'analyst',
    label: 'Analyst',
    userId: 'u-analyst-01',
    displayName: 'Priya Natarajan',
    email: 'priya.natarajan@example.test',
    entitlements: [
      'case-management:view',
      'fraud:view',
      'disputes:view',
      'assurance:view',
      'porting:view',
      'partners:view',
      'subscribers:view',
      'partner360:view',
      'case:usage:view',
      'case:account:view',
      'case:attachments:view',
      'case:attachments:upload',
      'case:resolve',
    ],
  },
  {
    id: 'supervisor',
    label: 'Supervisor',
    userId: 'u-supervisor-01',
    displayName: 'Marcus Lee',
    email: 'marcus.lee@example.test',
    entitlements: [
      'case-management:view',
      'fraud:view',
      'disputes:view',
      'assurance:view',
      'porting:view',
      'partners:view',
      'subscribers:view',
      'partner360:view',
      'reports:view',
      'case:usage:view',
      'case:account:view',
      'case:attachments:view',
      'case:attachments:upload',
      'case:audit:view',
      'case:resolve',
      'case:reassign',
    ],
  },
  {
    id: 'auditor',
    label: 'Auditor',
    userId: 'u-auditor-01',
    displayName: 'Helen Brandt',
    email: 'helen.brandt@example.test',
    entitlements: [
      'case-management:view',
      'fraud:view',
      'disputes:view',
      'assurance:view',
      'porting:view',
      'partners:view',
      'reports:view',
      'case:usage:view',
      'case:account:view',
      'case:attachments:view',
      'case:audit:view',
    ],
  },
];

export const DEFAULT_FEATURE_FLAGS: Record<string, boolean> = {
  'shell.globalSearch': false,
  'case.tabPreload': true,
};

/** Resolves the persona from the mock bearer token `mock.<personaId>` set by MockAuthService. */
export function personaFromRequest(request: Request): Persona {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const id = token.startsWith('mock.') ? token.slice(5) : '';
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

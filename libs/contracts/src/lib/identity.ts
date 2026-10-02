/** The signed-in user as every MFE sees it. Read-only outside the shell. */
export interface AuthUser {
  userId: string;
  displayName: string;
  email: string;
}

/** A mock-mode identity. Real environments never see personas. */
export interface Persona extends AuthUser {
  id: 'analyst' | 'supervisor' | 'auditor';
  label: string;
  entitlements: string[];
}

export interface EntitlementsResponse {
  entitlements: string[];
  featureFlags: Record<string, boolean>;
}

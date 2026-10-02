/** Build-time flags. Environment-specific VALUES (Okta, endpoints) are runtime config: see app-config.json. */
export const environment = {
  build: 'development' as 'development' | 'mock' | 'production',
  mocks: true,
  mockAuth: true,
};

/** Staging and production: real APIs, real Okta. The same artifact is promoted between them. */
export const environment = {
  build: 'production' as 'development' | 'mock' | 'production',
  mocks: false,
  mockAuth: false,
};

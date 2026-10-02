/** Optimised build that still runs on MSW + personas: deployed to the dev environment and used by CI E2E. */
export const environment = {
  build: 'mock' as 'development' | 'mock' | 'production',
  mocks: true,
  mockAuth: true,
};

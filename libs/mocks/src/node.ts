// Node entry for Vitest: `import { server } from '@platform/mocks/node'`-style usage via relative import in test setup.
import { setupServer } from 'msw/node';
import { allHandlers } from './handlers';

export const server = setupServer(...allHandlers);

/**
 * @file Vitest configuration for @platform/mocks (shared factory: tools/vitest/angular-vitest.config.mts).
 */
import { angularVitestConfig } from '../../tools/vitest/angular-vitest.config.mts';

// Handlers and fixtures are plain TS: run in Node so `msw/node` gets native fetch/streams.
export default angularVitestConfig(__dirname, { environment: 'node' });

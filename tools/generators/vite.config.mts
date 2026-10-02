/**
 * @file Vitest configuration for the workspace generators (Node environment).
 */
import { angularVitestConfig } from '../../tools/vitest/angular-vitest.config.mts';

export default angularVitestConfig(__dirname, { environment: 'node', setupFiles: [] });

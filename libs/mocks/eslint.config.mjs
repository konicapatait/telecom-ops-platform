/**
 * @file ESLint configuration for @platform/mocks (shared Angular rules: tools/eslint; architecture rules: root eslint.config.mjs).
 */
import { angularEslintConfig } from '../../tools/eslint/angular.config.mjs';

// The one place MSW may be imported (ADR-0006).
export default angularEslintConfig('platform', [
  { ignores: ['assets/**'] },
  { files: ['**/*.ts'], rules: { 'no-restricted-imports': 'off' } },
]);

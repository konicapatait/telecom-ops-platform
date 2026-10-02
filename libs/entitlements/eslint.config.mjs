/**
 * @file ESLint configuration for @platform/entitlements (shared Angular rules: tools/eslint; architecture rules: root eslint.config.mjs).
 */
import { angularEslintConfig } from '../../tools/eslint/angular.config.mjs';

export default angularEslintConfig(['platform', 'has']);

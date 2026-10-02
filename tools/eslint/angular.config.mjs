/**
 * @file Shared ESLint rules for Angular projects: selector prefixes and mandatory OnPush (ADR-0010, ADR-0014).
 */
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

/**
 * Angular project lint config. `prefix` is the project's selector prefix (e.g. 'shell', 'fraud'),
 * or an array when a lib deliberately exposes a second one (e.g. `*hasEntitlement`).
 */
export function angularEslintConfig(prefix, extraRules = []) {
  return [
    ...baseConfig,
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    {
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix, style: 'camelCase' }],
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix, style: 'kebab-case' }],
        '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      },
    },
    ...extraRules,
  ];
}

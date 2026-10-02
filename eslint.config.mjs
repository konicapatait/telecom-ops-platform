import nx from '@nx/eslint-plugin';

/**
 * Architecture rules live here (ADR-0002, ADR-0003, ADR-0006). Tags are set in each project.json:
 *   type:   app | layout | contracts | shared-lib | mocks
 *   family: host | case | 360 | reporting | capability   (apps and layout libs)
 *   scope:  shared                                       (libs every app may use)
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/vite.config.*.timestamp*', '**/vitest.config.*.timestamp*', 'libs/mocks/assets/**', 'vendor/**'],
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.mts', '**/*.mjs'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$', '^.*/tools/vitest/.*$'],
          depConstraints: [
            // --- by type -------------------------------------------------------------
            { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: [], bannedExternalImports: ['@org/*', 'msw', 'msw/*', '@okta/*'] },
            { sourceTag: 'type:shared-lib', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib'], bannedExternalImports: ['msw', 'msw/*'] },
            { sourceTag: 'type:mocks', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib', 'type:mocks'] },
            { sourceTag: 'type:layout', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib'], bannedExternalImports: ['msw', 'msw/*'] },
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib', 'type:layout', 'type:mocks'] },
            // --- by family: an app may only use its OWN family's layout lib --------------
            { sourceTag: 'family:host', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'family:capability', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'family:reporting', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'family:case', onlyDependOnLibsWithTags: ['scope:shared', 'family:case'] },
            { sourceTag: 'family:360', onlyDependOnLibsWithTags: ['scope:shared', 'family:360'] },
          ],
        },
      ],
      // Mocks only through start-mocks.ts (fileReplacements swaps it out in production) and tests. ADR-0006.
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@platform/mocks', message: 'Import @platform/mocks only from src/start-mocks.ts or *.spec.ts (ADR-0006).' },
            { name: '@platform/mocks/fixtures', message: 'Fixtures are for specs and start-mocks.ts only (ADR-0006).' },
          ],
          patterns: [{ group: ['msw', 'msw/*'], message: 'MSW is used only inside libs/mocks (ADR-0006).' }],
        },
      ],
    },
  },
  {
    files: ['**/start-mocks.ts', '**/*.spec.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    // Build/test config files reach into tools/ and libs/mf-manifest by relative path on purpose.
    files: ['**/vite.config.mts', '**/eslint.config.mjs', '**/federation.config.js'],
    rules: { '@nx/enforce-module-boundaries': 'off' },
  },
  {
    files: ['**/*.js', '**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];

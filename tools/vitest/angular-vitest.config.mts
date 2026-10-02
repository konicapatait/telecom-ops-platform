/**
 * Shared Vitest config factory for Angular projects (apps and libs).
 * Each project's vite.config.mts is one line: `export default angularVitestConfig(__dirname, '<project-root>')`.
 */
import { defineConfig, type UserConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';
import { join, relative } from 'node:path';

const workspaceRoot = join(__dirname, '..', '..');

export function angularVitestConfig(projectDir: string, overrides: UserConfig['test'] = {}) {
  const projectRoot = relative(workspaceRoot, projectDir);
  return defineConfig({
    root: projectDir,
    cacheDir: join(workspaceRoot, 'node_modules/.vite', projectRoot),
    plugins: [
      angular({ tsconfig: join(projectDir, 'tsconfig.spec.json') }),
      tsconfigPaths({ root: workspaceRoot, projects: ['tsconfig.base.json'] }),
    ],
    test: {
      name: projectRoot,
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
      setupFiles: [join(workspaceRoot, 'tools/vitest/test-setup.ts')],
      reporters: ['default'],
      passWithNoTests: true,
      coverage: { provider: 'v8', reportsDirectory: join(workspaceRoot, 'coverage', projectRoot) },
      ...overrides,
    },
  });
}

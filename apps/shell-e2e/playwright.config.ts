/**
 * @file Composed E2E: the real shell + real remotes on mocks (MSW).
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Composed E2E: the real shell + real remotes on mocks (MSW). Phase gates are encoded here as tests.
 * Local: PW_CHANNEL=chrome uses your installed Chrome (no browser download). CI: `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  // Dev servers compile each remote on its first request; with 12+ remotes that can exceed the 5 s default.
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? [['junit', { outputFile: '../../test-output/shell-e2e/junit.xml' }], ['list']] : 'list',
  outputDir: '../../test-output/shell-e2e/artifacts',
  use: {
    baseURL: process.env['BASE_URL'] ?? 'http://localhost:4200',
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env['PW_CHANNEL'] || undefined } },
  ],
  webServer: process.env['BASE_URL']
    ? undefined
    : {
        command: 'npx nx run-many -t serve --projects=tag:type:app --parallel=50',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 240_000,
        cwd: '../..',
      },
});

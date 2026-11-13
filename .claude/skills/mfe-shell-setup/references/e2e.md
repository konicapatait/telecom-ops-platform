# Composed E2E and phase gates (ADR-0014)

`apps/shell-e2e` runs the real shell and remotes on mocks (MSW), against local dev servers or any deployed environment (`BASE_URL=https://app.dev.<domain>`).

## `apps/shell-e2e/project.json`
```json
{
  "name": "shell-e2e",
  "projectType": "application",
  "sourceRoot": "apps/shell-e2e/src",
  "tags": ["type:e2e"],
  "implicitDependencies": ["shell"],
  "targets": {
    "e2e": { "executor": "nx:run-commands", "options": { "command": "playwright test -c apps/shell-e2e/playwright.config.ts" }, "cache": false }
  }
}
```

## `apps/shell-e2e/playwright.config.ts`
```ts
/** @file Composed E2E: the real shell + real remotes on mocks (MSW). Phase gates are encoded here as tests. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  // Dev servers compile each remote on its first request; with many remotes that can exceed the 5 s default.
  expect: { timeout: 10_000 },
  reporter: process.env['CI'] ? [['junit', { outputFile: '../../test-output/shell-e2e/junit.xml' }], ['list']] : 'list',
  outputDir: '../../test-output/shell-e2e/artifacts',
  use: { baseURL: process.env['BASE_URL'] ?? 'http://localhost:4200', trace: 'retain-on-failure', serviceWorkers: 'allow' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env['PW_CHANNEL'] || undefined } }],
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
```
Local: `PW_CHANNEL=chrome npm run e2e` uses the installed Chrome. Some embedded/IDE browsers lack service-worker support, so mock mode does not run there: verify in Chrome.

## `apps/shell-e2e/src/phase-1-shell.spec.ts` (template)
```ts
/** @file Phase 1 gate: remotes load through the manifest; a stopped remote breaks only its section; Retry recovers without reload. */
import { expect, test } from '@playwright/test';

const REMOTE = 'mfe-<first-remote>';
const PORT = 4201; // its local dev port from the local manifest
const SECTION = { path: '/<route>', nav: '<Nav label>', heading: '<Heading on its first page>' };

/** A remote's files, from its dev server (:port) or a deployed env (/mfe/<remote>/<version>/). */
const remoteFiles = (url: URL) => url.port === String(PORT) || url.pathname.startsWith(`/mfe/${REMOTE}/`);
const nav = (page: import('@playwright/test').Page) => page.getByRole('navigation', { name: 'Primary' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('platform.mockPersona')) localStorage.setItem('platform.mockPersona', 'analyst');
  });
});

test('shell renders chrome, mock badge and the signed-in persona', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  await expect(page.getByText('Mock data')).toBeVisible();
  await expect(nav(page).getByRole('link', { name: SECTION.nav })).toBeVisible();
});

test('loads a remote through the manifest and shares singletons with the shell', async ({ page }) => {
  await page.goto('/');
  await nav(page).getByRole('link', { name: SECTION.nav }).click(); // navigate in-app; a deep goto races lazy remotes
  await expect(page.getByRole('heading', { name: SECTION.heading })).toBeVisible();
  await expect(page.getByText(/Signed in as .+ · \d+ entitlements/)).toBeVisible(); // same AuthService/EntitlementsService
});

test('a stopped remote breaks only its own section, and Retry recovers it', async ({ page, context }) => {
  // context.route (not page.route): MSW's service worker re-issues requests page.route does not see.
  await context.route(remoteFiles, (route) => route.abort('connectionrefused'));
  await page.goto('/');
  await nav(page).getByRole('link', { name: SECTION.nav }).click();
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();
  await nav(page).getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();
  await nav(page).getByRole('link', { name: SECTION.nav }).click();
  await context.unroute(remoteFiles);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: SECTION.heading })).toBeVisible();
});

test('?mockFail=<remote> simulates a failed remote', async ({ page }) => {
  // The flag is read from location.search at load time: open the section URL directly.
  await page.goto(`${SECTION.path}?mockFail=${REMOTE}`);
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();
});

test('unknown routes show not-found inside the chrome', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(nav(page)).toBeVisible();
});
```

## Writing gates
- One spec per phase: `phase-N-<name>.spec.ts`, written **before** the work; it fails until the phase is done.
- Locators: `getByRole(..., { name: /^…/ })`, `exact: true`, scoped to a region; the same text often appears in several places.
- Wait for every dev server port before the first test (`webServer` waits only for the shell).
- Restart dev servers after a production build in the same workspace.
- Run against dev servers **and** a deployed environment (`BASE_URL=…`) before closing a phase.

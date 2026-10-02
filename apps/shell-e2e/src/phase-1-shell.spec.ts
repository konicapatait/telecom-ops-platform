import { expect, test } from '@playwright/test';

/**
 * Phase 0 gate: a generated remote appears through the manifest.
 * Phase 1 gate: the shell loads a remote through the manifest, and stopping that remote shows the
 * fallback WITHOUT breaking navigation; Retry recovers without a page reload.
 */
/** A remote's files, whether served by its dev server (:port) or from a deployed env (/<remote>/<version>/). */
const remoteFiles = (remote: string, port: number) => (url: URL) =>
  url.port === String(port) || url.pathname.startsWith(`/${remote}/`);
const HUB_REMOTE = remoteFiles('mfe-case-management', 4212);

test.beforeEach(async ({ page }) => {
  // Seed once per test; a later persona switch must survive the reload it triggers.
  await page.addInitScript(() => {
    if (!localStorage.getItem('platform.mockPersona')) localStorage.setItem('platform.mockPersona', 'analyst');
  });
});

test('shell renders chrome, mock badge and the signed-in persona', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome, Priya Natarajan/ })).toBeVisible();
  await expect(page.getByText('Mock data')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Case management' }),
  ).toBeVisible();
});

test('loads remotes through the manifest and shares singletons with the shell', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Case management' }).click();
  await expect(page).toHaveURL(/\/case-management\/fraud$/); // hub remote → first tab → mfe-fraud remote
  await expect(page.getByRole('heading', { name: 'Fraud alerts' })).toBeVisible();
  // The remote's entitlementGuard passed and its API call carried the persona token:
  // the remote used the shell's AuthService / EntitlementsService instances (shared mappings).
  await expect(page.getByRole('link', { name: 'FRD-2026-000142' })).toBeVisible();
});

test('a stopped remote breaks only its own section, and Retry recovers it', async ({ page, context }) => {
  // context.route (not page.route) also catches requests re-issued by the MSW service worker.
  await context.route(HUB_REMOTE, (route) => route.abort('connectionrefused'));
  await page.goto('/case-management');
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();

  // Navigation still works.
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Home' }).click();
  await expect(page.getByRole('heading', { name: /Welcome/ })).toBeVisible();

  // Back to the broken section (in-app navigation, no reload), then bring the remote "back" and retry in place.
  await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Case management' }).click();
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();
  await context.unroute(HUB_REMOTE);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('heading', { name: 'Fraud alerts' })).toBeVisible();
});

test('?mockFail=<remote> simulates a failed remote', async ({ page }) => {
  await page.goto('/case-management?mockFail=mfe-case-management');
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();
});

test('persona switch signs in as someone else', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Persona').selectOption('auditor');
  await expect(page.getByRole('heading', { name: /Welcome, Helen Brandt/ })).toBeVisible();
});

test('unknown routes show not-found inside the chrome', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
});

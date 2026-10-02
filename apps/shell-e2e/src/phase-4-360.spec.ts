import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 4 gate (implementation plan): an agent moves from case BIL-2026-003318 to the subscriber's 360 view
 * ("Customer full profile" since ADR-0026) and back WITHOUT a full reload. Plus: header subscriber search, Agent full profile, panel isolation, no audit on 360.
 */
const as = (page: Page, persona: 'analyst' | 'supervisor' | 'auditor') =>
  page.addInitScript((p) => {
    if (!localStorage.getItem('platform.mockPersona')) localStorage.setItem('platform.mockPersona', p);
  }, persona);
const section = (page: Page, title: string) => page.getByRole('region', { name: title, exact: true });
const panel = (page: Page, remote: string) => page.locator(`l360-panel-host[data-remote="${remote}"]`);
const remoteFiles = (remote: string, port: number) => (url: URL) =>
  url.port === String(port) || url.pathname.startsWith(`/${remote}/`);

/** Set on the page; a full reload would wipe it. */
const markPage = (page: Page) => page.evaluate(() => ((window as unknown as { __noReload: number }).__noReload = 42));
const pageNotReloaded = (page: Page) =>
  page.evaluate(() => (window as unknown as { __noReload?: number }).__noReload === 42);

test('case BIL-2026-003318 → customer full profile → back, without a full reload', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto('/case-management/disputes/cases/BIL-2026-003318');
  await expect(page.locator('cw-case-header')).toContainText('BIL-2026-003318');
  await markPage(page);

  await page.getByRole('button', { name: 'Customer full profile' }).click();
  await expect(page).toHaveURL(/\/customer-full-profile\/ACC-120077$/);
  await expect(page.getByRole('heading', { name: 'Daniel Okafor', level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Key figures' })).toContainText('Open cases');
  await expect(panel(page, 'mfe-cap-account-view')).toHaveAttribute('data-state', 'ready');
  await expect(section(page, 'Account & lines')).toContainText('Business Unlimited');
  await expect(section(page, 'Open cases')).toContainText('BIL-2026-003318');
  await expect(section(page, 'Open cases')).toContainText('NPT-2026-000088');

  await page.goBack();
  await expect(page).toHaveURL(/\/case-management\/disputes\/cases\/BIL-2026-003318/);
  await expect(page.locator('cw-case-view')).toHaveCount(1);
  expect(await pageNotReloaded(page)).toBe(true);

  // …and forward again via the 360's own case link, still the same page.
  await page.goForward();
  await section(page, 'Open cases')
    .getByRole('button', { name: /NPT-2026-000088/ })
    .click();
  await expect(page).toHaveURL(/\/case-management\/porting\/cases\/NPT-2026-000088$/);
  expect(await pageNotReloaded(page)).toBe(true);
});

test('global header search opens a customer full profile with account and usage panels', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/');
  const search = page.getByRole('searchbox', { name: 'Search by account number or phone number' });
  await search.fill('0142');
  await expect(page.getByRole('list', { name: 'Search results' })).toContainText('Maria Delgado');
  await search.press('Enter');

  await expect(page).toHaveURL(/\/customer-full-profile\/ACC-884210$/);
  await expect(page.getByRole('heading', { name: 'Maria Delgado', level: 1 })).toBeVisible();
  await expect(panel(page, 'mfe-cap-usage-billing')).toHaveAttribute('data-state', 'ready');
  await expect(section(page, 'Usage & billing')).toContainText('3 flagged'); // usage by accountId
  await expect(section(page, 'Account & lines')).toContainText('iPhone 16');
});

test('agent full profile: from a partner case, then to a linked subscriber', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/partners/field-audit/cases/PTR-2026-000057');
  await page.getByRole('button', { name: 'Agent full profile' }).click();

  await expect(page).toHaveURL(/\/agent-full-profile\/DLR-55102$/);
  await expect(page.getByRole('heading', { name: 'Sunrise Mobile', level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Key figures' })).toContainText('412');
  await expect(section(page, 'Findings')).toContainText('SIM swaps without ID scan');
  await expect(section(page, 'Open cases')).toContainText('PTR-2026-000057');

  await section(page, 'Linked customers')
    .getByRole('button', { name: /ACC-884210/ })
    .click();
  await expect(page).toHaveURL(/\/customer-full-profile\/ACC-884210$/);
});

test('a down panel capability breaks only its own panel', async ({ page, context }) => {
  await as(page, 'supervisor');
  const usage = remoteFiles('mfe-cap-usage-billing', 4203);
  await context.route(usage, (r) => r.abort('connectionrefused'));
  await page.goto('/customer-full-profile/ACC-884210');

  await expect(
    section(page, 'Usage & billing').getByRole('heading', { name: 'This panel is unavailable' }),
  ).toBeVisible();
  await expect(section(page, 'Account & lines')).toContainText('Unlimited Plus'); // the rest still works

  await context.unroute(usage);
  await section(page, 'Usage & billing').getByRole('button', { name: 'Retry' }).click();
  await expect(section(page, 'Usage & billing')).toContainText('3 flagged');
});

test('full-profile views never show the audit log, and need their entitlement', async ({ page }) => {
  await as(page, 'auditor'); // auditor has no subscribers:view
  await page.goto('/');
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Customer full profile' }),
  ).toHaveCount(0);
  await page.goto('/customer-full-profile/ACC-884210');
  await expect(page).toHaveURL(/\/forbidden/);
});

test('customer full profile has no audit log section', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/customer-full-profile/ACC-884210');
  await expect(page.getByRole('heading', { name: 'Maria Delgado', level: 1 })).toBeVisible();
  await expect(page.locator('l360-panel-host[data-remote="mfe-cap-audit-trail"]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /audit/i })).toHaveCount(0);
});

test('old 360 URLs redirect to the full-profile URLs (ADR-0026)', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/subscribers/ACC-884210');
  await expect(page).toHaveURL(/\/customer-full-profile\/ACC-884210$/);
  await page.goto('/partner-360/DLR-55102');
  await expect(page).toHaveURL(/\/agent-full-profile\/DLR-55102$/);
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Customer full profile' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Agent full profile' })).toBeVisible();
});

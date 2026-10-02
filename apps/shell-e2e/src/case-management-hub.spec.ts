import { expect, test, type Page } from '@playwright/test';

/**
 * Case management redesign (ADR-0022): one page, customer overview on top, one tab per case-domain remote.
 * Gate: the overview shows the focused customer's basic details; each domain loads as a tab on the same page;
 * cases open inside their tab; old section URLs redirect; one down domain breaks only its own tab.
 */
const as = (page: Page, persona: 'analyst' | 'supervisor' | 'auditor') =>
  page.addInitScript((p) => {
    if (!localStorage.getItem('platform.mockPersona')) localStorage.setItem('platform.mockPersona', p);
  }, persona);
const domainTabs = (page: Page) => page.getByRole('navigation', { name: 'Case domains' });
const overview = (page: Page) => page.getByRole('region', { name: 'Customer overview' });
const remoteFiles = (remote: string, port: number) => (url: URL) =>
  url.port === String(port) || url.pathname.startsWith(`/${remote}/`);

test('one Case management entry replaces the five domain sections', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Primary' });
  await expect(nav.getByRole('link', { name: 'Case management' })).toBeVisible();
  for (const old of ['Fraud', 'Billing disputes', 'Service assurance', 'Number porting', 'Partner oversight']) {
    await expect(nav.getByRole('link', { name: old, exact: true })).toHaveCount(0);
  }
  await nav.getByRole('link', { name: 'Case management' }).click();
  await expect(page).toHaveURL(/\/case-management\/fraud$/);
  await expect(page.getByRole('heading', { name: 'Case management', level: 1 })).toBeVisible();
  await expect(domainTabs(page).getByRole('link')).toHaveText([
    'Fraud',
    'Billing disputes',
    'Service assurance',
    'Number porting',
    'Partner oversight',
  ]);
  await expect(overview(page)).toContainText('Find a customer');
});

test('focusing a customer shows their details and filters every domain tab', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management');
  await page.getByRole('searchbox', { name: 'Search customers' }).fill('delgado');
  await page.getByRole('searchbox', { name: 'Search customers' }).press('Enter');
  await page.getByRole('button', { name: /Maria Delgado/ }).click();

  await expect(page).toHaveURL(/\/case-management\/customers\/ACC-884210\/fraud$/);
  await expect(overview(page)).toContainText('Maria Delgado');
  await expect(overview(page)).toContainText('ACC-884210');
  await expect(overview(page)).toContainText('Unlimited Plus · 2 lines');
  await expect(overview(page)).toContainText('DLR-55102');

  await expect(domainTabs(page).getByRole('link', { name: /Fraud/ })).toContainText('1'); // open-case badge
  await expect(page.getByRole('heading', { name: 'Fraud alerts for Maria Delgado' })).toBeVisible();
  await expect(page.locator('cw-case-queue tbody tr')).toHaveCount(1);

  await domainTabs(page)
    .getByRole('link', { name: /Billing disputes/ })
    .click();
  await expect(page.getByRole('heading', { name: 'No billing disputes' })).toBeVisible();

  await domainTabs(page)
    .getByRole('link', { name: /Service assurance/ })
    .click();
  await expect(page.getByRole('link', { name: 'SVC-2026-000311' })).toBeVisible();

  // Partner tab shows the dealer linked to this subscriber (DLR-55102).
  await domainTabs(page)
    .getByRole('link', { name: /Partner oversight/ })
    .click();
  await page.getByRole('navigation', { name: 'Partner journeys' }).getByRole('link', { name: 'Field audits' }).click();
  await expect(page.getByRole('link', { name: 'PTR-2026-000057' })).toBeVisible();
});

test('a case opens inside its tab, under the overview, and the tab remembers it', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/customers/ACC-884210/fraud');
  await page.getByRole('link', { name: 'FRD-2026-000142' }).click();

  await expect(page).toHaveURL(/\/case-management\/customers\/ACC-884210\/fraud\/cases\/FRD-2026-000142/);
  await expect(page.locator('cw-case-view')).toHaveCount(1);
  await expect(overview(page)).toContainText('Maria Delgado'); // overview stays
  await expect(domainTabs(page)).toBeVisible(); // domain tabs stay

  await domainTabs(page)
    .getByRole('link', { name: /Service assurance/ })
    .click();
  await expect(page.locator('cw-case-queue')).toHaveCount(1);
  await domainTabs(page).getByRole('link', { name: /Fraud/ }).click();
  await expect(page).toHaveURL(/\/fraud\/cases\/FRD-2026-000142/); // back where the agent was
  await expect(page.locator('cw-case-view')).toHaveCount(1);
});

test('old section URLs redirect into the matching tab, and the overview follows the open case', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/fraud/cases/FRD-2026-000142?tab=audit');
  await expect(page).toHaveURL(/\/case-management\/fraud\/cases\/FRD-2026-000142\?tab=audit$/);
  await expect(page.getByRole('tab', { name: 'Audit log' })).toHaveAttribute('aria-selected', 'true');

  await expect(overview(page)).toContainText('From the open case');
  await page.getByRole('button', { name: 'Show all cases for Maria Delgado' }).click();
  await expect(page).toHaveURL(/\/case-management\/customers\/ACC-884210\/fraud$/);
});

test('case links from elsewhere resolve to the right tab', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/cases/PTR-2026-000057');
  await expect(page).toHaveURL(/\/case-management\/partners\/field-audit\/cases\/PTR-2026-000057$/);
  await expect(domainTabs(page).getByRole('link', { name: /Partner oversight/ })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('a down domain remote breaks only its own tab; Retry recovers it', async ({ page, context }) => {
  await as(page, 'supervisor');
  const disputes = remoteFiles('mfe-billing-disputes', 4206);
  await context.route(disputes, (r) => r.abort('connectionrefused'));
  await page.goto('/case-management/customers/ACC-120077/disputes');

  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();
  await expect(overview(page)).toContainText('Daniel Okafor'); // overview still works

  await domainTabs(page)
    .getByRole('link', { name: /Number porting/ })
    .click();
  await expect(page.getByRole('link', { name: 'NPT-2026-000088' })).toBeVisible(); // other tabs still work

  // Still down when coming back to the tab.
  await domainTabs(page)
    .getByRole('link', { name: /Billing disputes/ })
    .click();
  await expect(page.getByRole('heading', { name: 'This section is unavailable' })).toBeVisible();

  // Remote comes back: Retry in place, no page reload. (Re-opening the tab would also recover it.)
  await context.unroute(disputes);
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('link', { name: 'BIL-2026-003318' })).toBeVisible();
});

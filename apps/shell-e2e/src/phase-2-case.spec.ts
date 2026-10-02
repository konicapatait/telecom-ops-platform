import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 2 gate (implementation plan), on the four-tab case screen (ADR-0023):
 *   case FRD-2026-000142 opens from the queue; each tab loads on first open and keeps its state;
 *   an uploaded file appears in the audit log; Auditor sees the audit log but not upload;
 *   stopping one capability remote breaks only its tab.
 */
const CASE = 'FRD-2026-000142';
const as = (page: Page, persona: 'analyst' | 'supervisor' | 'auditor') =>
  page.addInitScript((p) => localStorage.setItem('platform.mockPersona', p), persona);
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const host = (page: Page, remote: string) => page.locator(`cw-capability-tab-host[data-remote="${remote}"]`);
const auditRows = (page: Page) => page.locator('audittrail-audit-trail tbody tr.al__row');
const remoteFiles = (remote: string, port: number) => (url: URL) =>
  url.port === String(port) || url.pathname.startsWith(`/${remote}/`);

test('opens the hero case from the fraud queue on the four-tab case screen', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto('/case-management/fraud');
  await expect(page.getByRole('heading', { name: 'Fraud alerts' })).toBeVisible();
  await page.getByRole('link', { name: CASE }).click();

  await expect(page).toHaveURL(new RegExp(`/case-management/fraud/cases/${CASE}`));
  await expect(page.getByRole('heading', { name: new RegExp(`Fraud case ${CASE}`) })).toBeVisible();
  await expect(page.getByText('Maria Delgado · ACC-884210')).toBeVisible();
  await expect(page.getByText('Case ' + CASE, { exact: true })).toBeVisible(); // shell reads CaseContextStore
  await expect(page.getByRole('tab')).toHaveText(['Case decision', 'Triggering info', 'Attachments']); // analyst: no audit
  await expect(tab(page, 'Case decision')).toHaveAttribute('aria-selected', 'true');

  await tab(page, 'Triggering info').click();
  await expect(page.getByLabel('Risk score')).toHaveAttribute('value', '94');
});

test('tabs load on first open and keep their state', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/case-management/fraud/cases/${CASE}`);
  await expect(host(page, 'mfe-cap-case-resolution')).toHaveAttribute('data-state', 'ready');
  await expect(host(page, 'mfe-cap-audit-trail')).toHaveCount(0); // not created before first open

  await tab(page, 'Audit log').click();
  await expect(host(page, 'mfe-cap-audit-trail')).toHaveAttribute('data-state', 'ready');
  await page.getByRole('searchbox', { name: 'Search the audit log' }).fill('attach');
  await expect(auditRows(page)).toHaveCount(2);

  await tab(page, 'Attachments').click();
  await expect(host(page, 'mfe-cap-attachments').getByText('id-scan-at-store.pdf')).toBeVisible();
  await tab(page, 'Audit log').click();

  // Same instance: the search is still applied.
  await expect(page.getByRole('searchbox', { name: 'Search the audit log' })).toHaveValue('attach');
  await expect(auditRows(page)).toHaveCount(2);
  await expect(host(page, 'mfe-cap-audit-trail')).toHaveCount(1);
  await expect(page).toHaveURL(/tab=audit/);
});

test('an uploaded file appears in the audit log', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/case-management/fraud/cases/${CASE}?tab=audit`);
  await expect(auditRows(page).first()).toBeVisible(); // audit log alive in the background from now on

  await tab(page, 'Attachments').click();
  await page
    .getByLabel('File to upload')
    .setInputFiles({ name: 'sim-swap-receipt.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'sim-swap-receipt.png', exact: true })).toBeVisible();

  await tab(page, 'Audit log').click();
  const newest = auditRows(page).last(); // oldest first
  await expect(newest).toContainText('Activity');
  await expect(newest).toContainText('sim-swap-receipt.png');
  await expect(newest).toContainText('Attachments');
  await expect(newest).toContainText('Marcus Lee');
});

test('Auditor sees the audit log and the decision, but cannot upload or decide', async ({ page }) => {
  await as(page, 'auditor');
  await page.goto(`/case-management/fraud/cases/${CASE}`);
  await expect(host(page, 'mfe-cap-case-resolution').getByRole('status')).toContainText('No decision yet');
  await expect(page.getByRole('button', { name: 'Resolve case' })).toHaveCount(0);

  await tab(page, 'Attachments').click();
  await expect(page.getByText('id-scan-at-store.pdf')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Upload', exact: true })).toHaveCount(0);

  await tab(page, 'Audit log').click();
  await expect(page.getByRole('list', { name: 'Workflow progress' })).toContainText('Standard Investigation');
  await expect(auditRows(page).last()).toContainText('Case accessed in view mode');
  await expect(auditRows(page).last()).toContainText('Helen Brandt');
});

test('Analyst does not see the audit log but can decide', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto(`/case-management/fraud/cases/${CASE}`);
  await expect(tab(page, 'Triggering info')).toBeVisible();
  await expect(tab(page, 'Audit log')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resolve case' })).toBeVisible();
});

test('a stopped capability remote breaks only its own tab', async ({ page, context }) => {
  await as(page, 'analyst');
  const attachments = remoteFiles('mfe-cap-attachments', 4204);
  await context.route(attachments, (r) => r.abort('connectionrefused'));
  await page.goto(`/case-management/fraud/cases/${CASE}`);

  await tab(page, 'Attachments').click();
  await expect(
    host(page, 'mfe-cap-attachments').getByRole('heading', { name: 'This section is unavailable' }),
  ).toBeVisible();

  // The rest of the case still works.
  await tab(page, 'Triggering info').click();
  await expect(page.getByLabel('Risk score')).toBeVisible();

  // Remote comes back: Retry in place.
  await context.unroute(attachments);
  await tab(page, 'Attachments').click();
  await host(page, 'mfe-cap-attachments').getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('id-scan-at-store.pdf')).toBeVisible();
});

test('unknown case shows "Case not found" inside the layout', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto('/case-management/fraud/cases/FRD-0000-000000');
  await expect(page.getByRole('heading', { name: 'Case not found' })).toBeVisible();
});

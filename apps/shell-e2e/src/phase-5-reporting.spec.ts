import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 5 gate (implementation plan): dashboards render from mock series with domain and date filters applied;
 * export to CSV. Filters scope everything below them, so tiles, charts, table and export always agree.
 */
const as = (page: Page, persona: 'analyst' | 'supervisor' | 'auditor') =>
  page.addInitScript((p) => {
    if (!localStorage.getItem('platform.mockPersona')) localStorage.setItem('platform.mockPersona', p);
  }, persona);
const RANGE = 'from=2026-07-06&to=2026-09-28'; // 13 weekly points in the mock series
const lines = (page: Page) => page.locator('reporting-volume-chart path.chart__line');
const bars = (page: Page) => page.locator('reporting-sla-chart path.chart__bar');
const tableRows = (page: Page) => page.locator('.rd__table tbody tr');
const tile = (page: Page, label: string) => page.locator('.rd__tile', { hasText: label }).locator('.rd__tile-value');
const toNumber = (s: string | null) => Number((s ?? '').replace(/[^\d.]/g, ''));

/** Sum of a numeric table column. */
async function columnSum(page: Page, col: number): Promise<number> {
  const cells = await page.locator(`.rd__table tbody tr td:nth-child(${col})`).allTextContents();
  return cells.reduce((n, c) => n + toNumber(c), 0);
}

test('dashboards render from the mock series', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/reports?${RANGE}`);
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  await expect(lines(page)).toHaveCount(5);
  await expect(bars(page)).toHaveCount(5);
  await expect(page.getByRole('list', { name: 'Legend' }).getByRole('listitem')).toHaveCount(5);
  await expect(tableRows(page)).toHaveCount(13 * 5);
  // Tiles agree with the table (same slice of data).
  expect(toNumber(await tile(page, 'Cases opened').textContent())).toBe(await columnSum(page, 3));
  expect(toNumber(await tile(page, 'Cases closed').textContent())).toBe(await columnSum(page, 4));
});

test('domain and date filters scope tiles, charts and table, and live in the URL', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/reports?${RANGE}`);
  await expect(tableRows(page)).toHaveCount(65);
  const allOpened = toNumber(await tile(page, 'Cases opened').textContent());

  for (const label of ['Billing disputes', 'Service assurance', 'Number porting', 'Partner oversight']) {
    await page.getByRole('checkbox', { name: label }).uncheck();
  }
  await expect(page).toHaveURL(/groups=fraud/);
  await expect(lines(page)).toHaveCount(1);
  await expect(bars(page)).toHaveCount(1);
  await expect(tableRows(page)).toHaveCount(13);
  await expect(page.locator('reporting-volume-chart text.chart__endlabel')).toHaveText(['Fraud']); // ≤ 4 series → direct label
  const fraudOpened = toNumber(await tile(page, 'Cases opened').textContent());
  expect(fraudOpened).toBeLessThan(allOpened);
  expect(fraudOpened).toBe(await columnSum(page, 3));

  await page.getByLabel('From', { exact: true }).fill('2026-09-01');
  await page.getByLabel('From', { exact: true }).dispatchEvent('change');
  await expect(page).toHaveURL(/from=2026-09-01/);
  await expect(tableRows(page)).toHaveCount(4); // 4 Mondays in Sep 7–28
  await expect(page.getByRole('combobox', { name: /^Period/ })).toHaveValue('custom');

  await page.reload(); // the URL is the source of truth
  await expect(tableRows(page)).toHaveCount(4);
  await expect(page.getByRole('checkbox', { name: 'Billing disputes' })).not.toBeChecked();
});

test('chart tooltips work by pointer and keyboard', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/reports?${RANGE}`);
  const chart = page.locator('reporting-volume-chart svg');
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  const tip = page.locator('reporting-volume-chart .chart__tooltip');
  await expect(tip).toContainText('Week of');
  await expect(tip.locator('.chart__tooltip-row')).toHaveCount(5); // one tooltip, every series

  await page.mouse.move(0, 0);
  await page.getByRole('group', { name: /Cases opened per week/ }).focus();
  await expect(tip).toContainText('Week of Sep 28');
  await page.keyboard.press('ArrowLeft');
  await expect(tip).toContainText('Week of Sep 21');

  await page.getByRole('button', { name: /^Fraud: .*% within SLA/ }).focus();
  await expect(page.locator('reporting-sla-chart .chart__tooltip')).toContainText('within SLA');
});

test('CSV export downloads exactly the rows on screen', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto(`/reports?${RANGE}&groups=fraud,porting`);
  await expect(tableRows(page)).toHaveCount(26);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('case-report_2026-07-06_2026-09-28.csv');
  const csv = readFileSync((await download.path())!, 'utf8')
    .trim()
    .split('\r\n');
  expect(csv[0]).toBe('Week starting,Case domain,Opened,Closed,Closed within SLA,Within SLA %');
  expect(csv).toHaveLength(26 + 1);
  expect(csv[1]).toMatch(/^2026-09-28,Fraud,\d+,\d+,\d+,\d+\.\d$/);
});

test('reports need the reports:view entitlement', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Reports' })).toHaveCount(0);
  await page.goto('/reports');
  await expect(page).toHaveURL(/\/forbidden/);
});

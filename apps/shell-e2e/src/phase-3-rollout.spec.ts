import { expect, test, type Page } from '@playwright/test';

/**
 * Phase 3 gate (implementation plan): all case domains use libs/case-workspace with no layout forks,
 * and tabs are configuration. Static half: `npm run check:case-domains`. This is the runtime half,
 * on the Case management page (ADR-0022) with the four-tab case screen (ADR-0023).
 */
const as = (page: Page, persona: 'analyst' | 'supervisor' | 'auditor') =>
  page.addInitScript((p) => localStorage.setItem('platform.mockPersona', p), persona);
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const host = (page: Page, remote: string) => page.locator(`cw-capability-tab-host[data-remote="${remote}"]`);
const FOUR_TABS = ['Case decision', 'Triggering info', 'Audit log', 'Attachments'];

const DOMAINS = [
  {
    section: '/case-management/disputes',
    queue: 'Billing disputes',
    caseId: 'BIL-2026-003318',
    remote: 'mfe-billing-disputes',
    evidence: '$742.60',
  },
  {
    section: '/case-management/assurance',
    queue: 'Service assurance',
    caseId: 'SVC-2026-000311',
    remote: 'mfe-service-assurance',
    evidence: 'BLD-0417 · Boulder, CO',
  },
  {
    section: '/case-management/porting',
    queue: 'Number porting',
    caseId: 'NPT-2026-000088',
    remote: 'mfe-number-porting',
    evidence: 'PIN mismatch (code 6P)',
  },
  {
    section: '/case-management/partners/onboarding',
    queue: 'Dealer onboarding',
    caseId: 'PTR-2026-000031',
    remote: 'mfe-partner-oversight',
    evidence: 'Peak Wireless',
  },
  {
    section: '/case-management/partners/ongoing',
    queue: 'Ongoing performance',
    caseId: 'PTR-2026-000044',
    remote: 'mfe-partner-oversight',
    evidence: 'SIM swaps without ID scan',
  },
  {
    section: '/case-management/partners/field-audit',
    queue: 'Field audits',
    caseId: 'PTR-2026-000057',
    remote: 'mfe-partner-oversight',
    evidence: 'Sunrise Mobile',
  },
];

for (const d of DOMAINS) {
  test(`${d.queue}: queue → case on the shared case layout`, async ({ page }) => {
    await as(page, 'supervisor');
    await page.goto(d.section);
    await expect(page.getByRole('heading', { name: d.queue, exact: true })).toBeVisible();
    await expect(page.locator('cw-case-queue')).toHaveCount(1);
    await page.getByRole('link', { name: d.caseId }).click();

    await expect(page.locator('cw-case-view')).toHaveCount(1);
    await expect(page.locator('cw-case-header')).toContainText(d.caseId);
    await expect(page.getByRole('tab')).toHaveText(FOUR_TABS);
    await tab(page, 'Triggering info').click();
    await expect(host(page, d.remote)).toHaveAttribute('data-state', 'ready'); // domain panel through the shared tab host
    await expect(page.getByText(d.evidence, { exact: false }).first()).toBeVisible();
  });
}

test('the Case decision tab shows the domain’s own codes', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/disputes/cases/BIL-2026-003318');
  await expect(page.getByLabel('Upheld: refund the disputed amount')).toBeVisible();
  await expect(page.getByLabel('Fraud confirmed: suspend line, reverse SIM swap')).toHaveCount(0);

  await page.goto('/case-management/partners/onboarding/cases/PTR-2026-000031');
  await expect(page.getByLabel('Approved: activate dealer')).toBeVisible();
});

test('a decision validates, closes the case and shows up in the audit log and its workflow track', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/fraud/cases/FRD-2026-000142?tab=audit');
  await expect(page.locator('tr.al__row').first()).toBeVisible();

  await tab(page, 'Case decision').click();
  await page.getByLabel('Fraud confirmed: suspend line, reverse SIM swap').check();
  await page.getByRole('button', { name: 'Resolve case' }).click();
  await expect(page.getByRole('alert')).toHaveText('A note is required for this outcome.');

  await page.getByLabel('Note (required)').fill('ID scan does not match account holder');
  await page.getByRole('button', { name: 'Resolve case' }).click();
  await expect(page.getByRole('status')).toContainText('Resolved: Fraud confirmed');
  await expect(page.locator('cw-case-header')).toContainText('CLOSED'); // header listens to CASE_RESOLVED

  await tab(page, 'Audit log').click(); // kept alive, refreshed by CASE_RESOLVED
  await expect(
    page.locator('tr.al__row').filter({ hasText: 'FRAUD_CONFIRMED · ID scan does not match account holder' }),
  ).toContainText('Case decision');
  await expect(page.locator('tr.al__row').last()).toContainText('Case moved to Closed');
  await expect(page.locator('.al__tier--current')).toContainText('Closed');
});

test('case search on Home opens the case in its tab on the Case management page', async ({ page }) => {
  await as(page, 'analyst');
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search cases' }).fill('okafor');
  await page.getByRole('searchbox', { name: 'Search cases' }).press('Enter');
  await page.getByRole('button', { name: /BIL-2026-003318/ }).click();
  await expect(page).toHaveURL(/\/case-management\/disputes\/cases\/BIL-2026-003318$/);
  await expect(page.locator('cw-case-header')).toContainText('Daniel Okafor');
});

test('partner journeys switch inside one remote', async ({ page }) => {
  await as(page, 'supervisor');
  await page.goto('/case-management/partners');
  await expect(page).toHaveURL(/\/case-management\/partners\/onboarding$/);
  await page.getByRole('navigation', { name: 'Partner journeys' }).getByRole('link', { name: 'Field audits' }).click();
  await expect(page.getByRole('heading', { name: 'Field audits', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'PTR-2026-000057' })).toBeVisible();
});

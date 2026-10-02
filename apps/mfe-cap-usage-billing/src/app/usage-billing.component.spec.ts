import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { USAGE_BY_CASE } from '@platform/mocks/fixtures';
import { UsageBillingComponent } from './usage-billing.component';

describe('UsageBillingComponent', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(UsageBillingComponent);
    fixture.componentRef.setInput('caseId', 'FRD-2026-000142');
    fixture.componentRef.setInput('caseType', 'FRAUD_SIM_SWAP');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    return { fixture, http };
  }

  it('highlights flagged events and can filter to them', async () => {
    const { fixture, http } = await render();
    http.expectOne('/api/cases/FRD-2026-000142/usage').flush(USAGE_BY_CASE['FRD-2026-000142']);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('tbody tr').length).toBe(6);
    expect(el.querySelectorAll('tr.ub__flagged').length).toBe(3);
    expect(el.textContent).toContain('3 flagged');

    (el.querySelector('input[type=checkbox]') as HTMLInputElement).click();
    await fixture.whenStable();
    expect(el.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('explains a 403 instead of failing', async () => {
    const { fixture, http } = await render();
    http.expectOne('/api/cases/FRD-2026-000142/usage').flush({}, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No access to usage');
  });

  it('loads by accountId when embedded as a 360 panel', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(UsageBillingComponent);
    fixture.componentRef.setInput('accountId', 'ACC-884210');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/accounts/ACC-884210/usage')
      .flush(USAGE_BY_CASE['FRD-2026-000142']);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});

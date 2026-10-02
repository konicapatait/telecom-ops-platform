import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ACCOUNTS } from '@platform/mocks/fixtures';
import { AccountViewComponent } from './account-view.component';

describe('AccountViewComponent', () => {
  async function render(caseId: string) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AccountViewComponent);
    fixture.componentRef.setInput('caseId', caseId);
    fixture.componentRef.setInput('caseType', 'FRAUD_SIM_SWAP');
    fixture.detectChanges();
    return { fixture, http: TestBed.inject(HttpTestingController), el: fixture.nativeElement as HTMLElement };
  }

  it('shows the account with its lines and devices', async () => {
    const { fixture, http, el } = await render('FRD-2026-000142');
    http.expectOne('/api/cases/FRD-2026-000142/account').flush(ACCOUNTS['ACC-884210']);
    await fixture.whenStable();
    expect(el.querySelectorAll('tbody tr').length).toBe(2);
    expect(el.textContent).toContain('iPhone 16');
    expect(el.textContent).toContain('SUSPENDED');
  });

  it('explains partner cases without an account', async () => {
    const { fixture, http, el } = await render('PTR-2026-000057');
    http.expectOne('/api/cases/PTR-2026-000057/account').flush({}, { status: 404, statusText: 'Not found' });
    await fixture.whenStable();
    expect(el.textContent).toContain('No subscriber account');
  });

  it('loads by accountId when embedded as a 360 panel', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AccountViewComponent);
    fixture.componentRef.setInput('accountId', 'ACC-884210');
    fixture.detectChanges();
    TestBed.inject(HttpTestingController).expectOne('/api/accounts/ACC-884210').flush(ACCOUNTS['ACC-884210']);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});

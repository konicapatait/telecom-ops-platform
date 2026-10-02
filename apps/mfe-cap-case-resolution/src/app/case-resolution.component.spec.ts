import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { CaseResolutionComponent } from './case-resolution.component';

const CODES = [
  { code: 'FRAUD_CONFIRMED', label: 'Fraud confirmed', requiresNote: true },
  { code: 'FRAUD_FALSE_POSITIVE', label: 'False positive', requiresNote: false },
];
const url = '/api/cases/FRD-2026-000142/resolution';

describe('CaseResolutionComponent', () => {
  async function render(entitlements = ['case:resolve']) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(EntitlementsService).set({ entitlements, featureFlags: {} });
    const fixture = TestBed.createComponent(CaseResolutionComponent);
    fixture.componentRef.setInput('caseId', 'FRD-2026-000142');
    fixture.componentRef.setInput('caseType', 'FRAUD_SIM_SWAP');
    fixture.componentRef.setInput('resolutionCodes', CODES);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush({}, { status: 404, statusText: 'Not found' });
    await fixture.whenStable();
    return {
      fixture,
      http,
      el: fixture.nativeElement as HTMLElement,
      cmp: fixture.componentInstance as unknown as { form: CaseResolutionComponent['form'] },
    };
  }

  it('renders the domain codes it is given', async () => {
    const { el } = await render();
    expect([...el.querySelectorAll('.dec__code > span:first-of-type')].map((l) => l.textContent?.trim())).toEqual([
      'Fraud confirmed',
      'False positive',
    ]);
  });

  it('is read-only without case:resolve', async () => {
    const { el } = await render([]);
    expect(el.querySelector('form')).toBeNull();
    expect(el.textContent).toContain('No decision yet');
  });

  it('requires a note only for codes that say so', async () => {
    const { cmp } = await render();
    cmp.form.setValue({ code: 'FRAUD_CONFIRMED', note: '' });
    expect(cmp.form.hasError('noteRequired')).toBe(true);
    cmp.form.setValue({ code: 'FRAUD_FALSE_POSITIVE', note: '' });
    expect(cmp.form.valid).toBe(true);
  });

  it('posts the resolution and emits CASE_RESOLVED', async () => {
    const { fixture, http, el, cmp } = await render();
    const events: unknown[] = [];
    TestBed.inject(CaseEventBus)
      .on(CaseEvent.CASE_RESOLVED)
      .subscribe((e) => events.push(e));
    cmp.form.setValue({ code: 'FRAUD_CONFIRMED', note: 'ID mismatch' });
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    const post = http.expectOne((r) => r.method === 'POST' && r.url === url);
    expect(post.request.body).toEqual({ code: 'FRAUD_CONFIRMED', note: 'ID mismatch' });
    post.flush({
      caseId: 'FRD-2026-000142',
      code: 'FRAUD_CONFIRMED',
      note: 'ID mismatch',
      resolvedBy: 'Marcus Lee',
      resolvedAt: '2026-10-02T10:00:00Z',
    });
    await new Promise((r) => setTimeout(r));
    await fixture.whenStable();
    expect(events).toEqual([{ caseId: 'FRD-2026-000142', code: 'FRAUD_CONFIRMED', at: '2026-10-02T10:00:00Z' }]);
    expect(el.textContent).toContain('Resolved: Fraud confirmed');
  });
});

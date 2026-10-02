import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { ATTACHMENTS_BY_CASE } from '@platform/mocks/fixtures';
import { AttachmentsComponent } from './attachments.component';

describe('AttachmentsComponent', () => {
  const url = '/api/cases/FRD-2026-000142/attachments';

  async function render(entitlements: string[]) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(EntitlementsService).set({ entitlements, featureFlags: {} });
    const fixture = TestBed.createComponent(AttachmentsComponent);
    fixture.componentRef.setInput('caseId', 'FRD-2026-000142');
    fixture.componentRef.setInput('caseType', 'FRAUD_SIM_SWAP');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(ATTACHMENTS_BY_CASE['FRD-2026-000142']);
    await fixture.whenStable();
    return { fixture, http, el: fixture.nativeElement as HTMLElement };
  }

  it('lists attachments and hides upload without case:attachments:upload', async () => {
    const { el } = await render(['case:attachments:view']);
    expect(el.textContent).toContain('id-scan-at-store.pdf');
    expect(el.querySelector('form')).toBeNull();
  });

  it('uploads, reloads and emits ATTACHMENT_ADDED', async () => {
    const { fixture, http, el } = await render(['case:attachments:view', 'case:attachments:upload']);
    const events: unknown[] = [];
    TestBed.inject(CaseEventBus)
      .on(CaseEvent.ATTACHMENT_ADDED)
      .subscribe((e) => events.push(e));

    const input = el.querySelector('input[type=file]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File(['x'], 'new.png', { type: 'image/png' })] });
    el.querySelector('form')!.dispatchEvent(new Event('submit'));

    const post = http.expectOne((r) => r.method === 'POST' && r.url === url);
    expect((post.request.body as FormData).get('category')).toBe('EVIDENCE');
    post.flush({ attachmentId: 'ATT-9', fileName: 'new.png' });
    await new Promise((r) => setTimeout(r)); // let upload() continue after the POST resolves
    TestBed.tick(); // the resource schedules its reload request
    // Flush the reload BEFORE awaiting stability: a pending request keeps the app unstable.
    http.expectOne((r) => r.method === 'GET' && r.url === url).flush([]);
    await fixture.whenStable();
    expect(events).toEqual([{ caseId: 'FRD-2026-000142', attachmentId: 'ATT-9' }]);
  });
});

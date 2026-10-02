import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { AUDIT_BY_CASE } from '@platform/mocks/fixtures';
import { AuditTrailComponent } from './audit-trail.component';

describe('AuditTrailComponent', () => {
  const url = '/api/cases/FRD-2026-000142/audit';

  async function render(events = AUDIT_BY_CASE['FRD-2026-000142']) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(AuditTrailComponent);
    fixture.componentRef.setInput('caseId', 'FRD-2026-000142');
    fixture.componentRef.setInput('caseType', 'FRAUD_SIM_SWAP');
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(url).flush(events);
    await fixture.whenStable();
    return { fixture, http, el: fixture.nativeElement as HTMLElement };
  }
  const rows = (el: HTMLElement) => [...el.querySelectorAll('tbody tr.al__row')];

  it('lists events oldest first with category, description, component and who', async () => {
    const { el } = await render();
    const r = rows(el);
    expect(r).toHaveLength(10);
    expect(r[0].textContent).toContain('SIM-swap fraud rule triggered');
    const cells = [...r[1].querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '');
    expect(cells.slice(0, 3)).toEqual(['Tier', 'Case moved to Readiness Check', 'Workflow']);
    expect(cells[3].startsWith('System')).toBe(true); // Who, then the timestamp
    expect(r[1].getAttribute('data-category')).toBe('tier');
  });

  it('draws the workflow track with the current stage and subprocess under the current tier', async () => {
    const { el } = await render();
    expect([...el.querySelectorAll('.al__pill')].map((p) => p.textContent?.trim())).toEqual([
      'Readiness Check',
      'Standard Investigation',
    ]);
    const current = el.querySelector('.al__tier--current')!;
    expect(current.getAttribute('aria-current')).toBe('step');
    expect(current.textContent).toContain('Ready For Work');
    expect(current.textContent).toContain('Available to Pull');
  });

  it('keeps the API order for events with the same timestamp', async () => {
    const at = '2026-10-02T10:00:00Z';
    const { el } = await render([
      {
        eventId: 'B',
        at,
        actor: 'System',
        action: 'WORKFLOW_MOVED',
        category: 'STAGE',
        to: 'Closed',
        detail: 'Case moved to Closed',
      },
      { eventId: 'A', at, actor: 'Marcus Lee', action: 'CASE_RESOLVED', detail: 'FRAUD_CONFIRMED' },
    ]);
    expect(rows(el).map((r) => r.querySelectorAll('td')[1].textContent?.trim())).toEqual([
      'FRAUD_CONFIRMED',
      'Case moved to Closed',
    ]);
  });

  it('filters as you type', async () => {
    const { fixture, el } = await render();
    const input = el.querySelector('input[type=search]') as HTMLInputElement;
    input.value = 'attach';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(rows(el)).toHaveLength(2);
  });

  it('reloads when an attachment is added to THIS case only', async () => {
    const { fixture, http } = await render([]);
    const bus = TestBed.inject(CaseEventBus);

    bus.emit(CaseEvent.ATTACHMENT_ADDED, { caseId: 'OTHER-1', attachmentId: 'A' });
    TestBed.tick();
    http.expectNone(url);

    bus.emit(CaseEvent.ATTACHMENT_ADDED, { caseId: 'FRD-2026-000142', attachmentId: 'A' });
    TestBed.tick();
    http.expectOne(url).flush([]);
    await fixture.whenStable();
  });
});

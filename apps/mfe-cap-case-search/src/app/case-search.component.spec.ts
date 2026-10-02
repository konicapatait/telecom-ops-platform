import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { HERO_CASES } from '@platform/mocks/fixtures';
import { CaseSearchComponent } from './case-search.component';

describe('CaseSearchComponent', () => {
  it('searches and asks the shell to open the chosen case', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(CaseSearchComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const opened: unknown[] = [];
    TestBed.inject(CaseEventBus)
      .on(CaseEvent.OPEN_CASE)
      .subscribe((e) => opened.push(e));

    const input = el.querySelector('input') as HTMLInputElement;
    input.value = 'okafor';
    input.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/cases' && r.params.get('q') === 'okafor')
      .flush({ items: [HERO_CASES[1]], total: 1, page: 0, size: 10 });
    await fixture.whenStable();

    (el.querySelector('.cs__hit') as HTMLButtonElement).click();
    expect(opened).toEqual([{ caseId: 'BIL-2026-003318', domain: 'BILLING_DISPUTE' }]);
  });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CaseEvent, CaseEventBus } from '@platform/contracts';
import { SubscriberSearchComponent } from './subscriber-search.component';

describe('SubscriberSearchComponent', () => {
  it('searches as you type and asks the shell to open the subscriber 360', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(SubscriberSearchComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const opened: unknown[] = [];
    TestBed.inject(CaseEventBus)
      .on(CaseEvent.OPEN_SUBSCRIBER_360)
      .subscribe((e) => opened.push(e));

    const input = el.querySelector('input') as HTMLInputElement;
    input.value = '0142';
    input.dispatchEvent(new Event('input'));
    TestBed.tick();
    await new Promise((r) => setTimeout(r, 250)); // debounce
    TestBed.inject(HttpTestingController)
      .expectOne((r) => r.url === '/api/customers' && r.params.get('q') === '0142')
      .flush([
        {
          customerId: 'ACC-884210',
          kind: 'SUBSCRIBER',
          displayName: 'Maria Delgado',
          status: 'ACTIVE',
          relatedSubjectIds: [],
          openCasesByDomain: {},
        },
      ]);
    await fixture.whenStable();

    el.querySelector('form')!.dispatchEvent(new Event('submit')); // Enter opens the first result
    expect(opened).toEqual([{ accountId: 'ACC-884210' }]);
  });
});

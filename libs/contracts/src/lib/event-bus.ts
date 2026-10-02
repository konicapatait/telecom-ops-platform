/**
 * @file Typed fire-and-forget bus for "something happened" between unrelated MFEs.
 */
import { Injectable } from '@angular/core';
import { Observable, Subject, filter, map } from 'rxjs';
import { CaseEvent, CaseEventMessage, CaseEventPayloads } from './events';

/**
 * Typed fire-and-forget bus for "something happened" between unrelated MFEs.
 * One instance per page: @platform/contracts is a federation shared singleton.
 */
@Injectable({ providedIn: 'root' })
export class CaseEventBus {
  private readonly events$ = new Subject<CaseEventMessage>();

  emit<E extends CaseEvent>(type: E, payload: CaseEventPayloads[E]): void {
    this.events$.next({ type, payload } as CaseEventMessage);
  }

  on<E extends CaseEvent>(type: E): Observable<CaseEventPayloads[E]> {
    return this.events$.pipe(
      filter((e): e is CaseEventMessage<E> => e.type === type),
      map((e) => e.payload),
    );
  }
}

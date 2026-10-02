/**
 * @file PERSONA_SWITCHER token: present only in mock configurations; the shell header shows a persona picker when it exists.
 */
import { InjectionToken, Signal } from '@angular/core';
import type { Persona } from '@platform/contracts';

/**
 * Present only in mock configurations. The shell header shows a persona picker when it can inject this.
 * Inject with `{ optional: true }`.
 */
export interface PersonaSwitcher {
  readonly personas: readonly Persona[];
  readonly current: Signal<Persona>;
  switchTo(id: Persona['id']): void;
}

export const PERSONA_SWITCHER = new InjectionToken<PersonaSwitcher>('PERSONA_SWITCHER');

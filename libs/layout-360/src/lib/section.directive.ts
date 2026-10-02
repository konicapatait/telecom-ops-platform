/**
 * @file `<ng-template l360Section="id">`: marks a 360 section that the app renders itself (not a capability remote).
 */
import { Directive, TemplateRef, inject, input } from '@angular/core';

/** `<ng-template l360Section="open-cases">…</ng-template>`: a section rendered by the 360 app itself. */
@Directive({ selector: 'ng-template[l360Section]' })
export class L360SectionDirective {
  readonly l360Section = input.required<string>();
  readonly template = inject(TemplateRef);
}

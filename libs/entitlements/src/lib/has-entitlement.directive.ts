/**
 * @file `*hasEntitlement` structural directive: renders its template only when the user holds the entitlement (UI hint; the API enforces, ADR-0019).
 */
import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';
import { EntitlementsService } from './entitlements.service';

/** `<button *hasEntitlement="'case:attachments:upload'">Upload</button>` */
@Directive({ selector: '[hasEntitlement]' })
export class HasEntitlementDirective {
  readonly hasEntitlement = input.required<string>();
  private readonly service = inject(EntitlementsService);
  private readonly template = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.service.has(this.hasEntitlement());
      if (allowed && !this.shown) this.vcr.createEmbeddedView(this.template);
      if (!allowed && this.shown) this.vcr.clear();
      this.shown = allowed;
    });
  }
}

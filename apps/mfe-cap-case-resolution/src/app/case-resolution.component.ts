/**
 * @file The "Case decision" tab, exposed as './CaseResolution': typed decision form with the domain's codes (ADR-0020, ADR-0023).
 */
import { DatePipe } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DsButton, DsEmptyState, DsNotificationService, DsSkeleton } from '@org/design-system';
import {
  CaseEvent,
  CaseEventBus,
  type CaseResolution,
  type CaseResolutionCode,
  type CaseType,
} from '@platform/contracts';
import { EntitlementsService } from '@platform/entitlements';
import { expectHttpErrors } from '@platform/utils';
import { catchError, firstValueFrom, of, throwError } from 'rxjs';

interface ResolutionForm {
  code: FormControl<string>;
  note: FormControl<string>;
}

/** `note` is required when the chosen code says so. */
function noteRequiredFor(codes: () => CaseResolutionCode[]) {
  return (group: AbstractControl): ValidationErrors | null => {
    const { code, note } = (group as FormGroup<ResolutionForm>).getRawValue();
    const needs = codes().find((c) => c.code === code)?.requiresNote;
    return needs && !note.trim() ? { noteRequired: true } : null;
  };
}

/**
 * Exposed as './CaseResolution', mounted as the "Case decision" tab (ADR-0023).
 * Everyone who can see the case sees its decision; only case:resolve holders get the form (the API enforces it too). Inputs follow CaseResolutionInputs:
 * caseId, caseType and the DOMAIN's resolutionCodes (ADR-0020). Typed reactive form; the backend validates again.
 * On success it emits CASE_RESOLVED so the case header and the audit tab update.
 */
@Component({
  selector: 'caseresolution-case-resolution',
  imports: [ReactiveFormsModule, DatePipe, DsButton, DsSkeleton, DsEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './case-resolution.component.html',
  styleUrl: './case-resolution.component.css',
})
export class CaseResolutionComponent {
  readonly caseId = input.required<string>();
  readonly caseType = input.required<CaseType>();
  readonly resolutionCodes = input<CaseResolutionCode[]>([]);

  private readonly http = inject(HttpClient);
  private readonly events = inject(CaseEventBus);
  private readonly toasts = inject(DsNotificationService);
  private readonly entitlements = inject(EntitlementsService);
  protected readonly canResolve = computed(() => this.entitlements.has('case:resolve'));

  protected readonly form = new FormGroup<ResolutionForm>(
    {
      code: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
    },
    { validators: noteRequiredFor(() => this.resolutionCodes()) },
  );
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  protected readonly noteRequired = computed(
    () => this.resolutionCodes().find((c) => c.code === this.formValue().code)?.requiresNote ?? false,
  );
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);

  /** Existing resolution (404 = still open). */
  protected readonly existing = rxResource({
    params: () => this.caseId(),
    stream: ({ params }) =>
      this.http
        // 404 = no decision yet: an expected answer, logged at DEBUG instead of WARN (ADR-0025).
        .get<CaseResolution>(`/api/cases/${encodeURIComponent(params)}/resolution`, { context: expectHttpErrors(404) })
        .pipe(catchError((e: HttpErrorResponse) => (e.status === 404 ? of(null) : throwError(() => e)))),
  });

  constructor() {
    // A different case: start from a clean form.
    effect(() => {
      this.caseId();
      this.form.reset();
      this.submitted.set(false);
      this.serverError.set(null);
    });
  }

  protected label(code: string): string {
    return this.resolutionCodes().find((c) => c.code === code)?.label ?? code;
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) return;
    const { code, note } = this.form.getRawValue();
    this.submitting.set(true);
    try {
      const r = await firstValueFrom(
        this.http.post<CaseResolution>(`/api/cases/${encodeURIComponent(this.caseId())}/resolution`, { code, note }),
      );
      this.existing.set(r);
      this.events.emit(CaseEvent.CASE_RESOLVED, { caseId: r.caseId, code: r.code, at: r.resolvedAt });
      this.toasts.show(`Case ${r.caseId} resolved`, 'success');
    } catch (e) {
      const err = e as HttpErrorResponse;
      this.serverError.set(
        err.status === 403
          ? 'You are not allowed to resolve cases.'
          : (err.error?.message ?? 'Resolution failed. Try again.'),
      );
    } finally {
      this.submitting.set(false);
    }
  }
}

export default CaseResolutionComponent;

/**
 * @file CaseContextStore: "which case is open" signal store with ONE writer (the case view).
 */
import { Injectable, computed, signal } from '@angular/core';
import type { CaseSummary } from './case';

/**
 * Ambient "which case is open" state. ONE writer (the case view in libs/case-workspace);
 * any number of readers (e.g. the shell breadcrumb). Readers must not call `set`/`clear`.
 */
@Injectable({ providedIn: 'root' })
export class CaseContextStore {
  private readonly _activeCase = signal<CaseSummary | null>(null);

  readonly activeCase = this._activeCase.asReadonly();
  readonly activeCaseId = computed(() => this._activeCase()?.caseId ?? null);

  set(caseSummary: CaseSummary): void {
    this._activeCase.set(caseSummary);
  }

  clear(): void {
    this._activeCase.set(null);
  }
}

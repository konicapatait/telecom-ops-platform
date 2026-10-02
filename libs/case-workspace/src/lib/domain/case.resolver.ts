/**
 * @file caseResolver: loads the CaseSummary for :caseId; resolves to null ("Case not found") instead of failing navigation.
 */
import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import type { CaseSummary } from '@platform/contracts';
import { catchError, of } from 'rxjs';

/** `resolve: { caseSummary: caseResolver }`. Resolves to null (rendered as "case not found") instead of failing navigation. */
export const caseResolver: ResolveFn<CaseSummary | null> = (route) =>
  inject(HttpClient)
    .get<CaseSummary>(`/api/cases/${encodeURIComponent(route.paramMap.get('caseId') ?? '')}`)
    .pipe(catchError(() => of(null)));

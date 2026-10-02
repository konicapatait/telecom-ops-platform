import { TestBed } from '@angular/core/testing';
import { provideRouter, type ActivatedRouteSnapshot, type RouterStateSnapshot, type UrlTree } from '@angular/router';
import { legacyRedirect } from './legacy-redirect';

const run = (url: string) =>
  TestBed.runInInjectionContext(() =>
    legacyRedirect('fraud', '/case-management/fraud')({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as UrlTree;

describe('legacyRedirect', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  it('keeps the remaining path and query params', () => {
    expect(run('/fraud/cases/FRD-1?tab=audit').toString()).toBe('/case-management/fraud/cases/FRD-1?tab=audit');
  });

  it('redirects the bare section', () => {
    expect(run('/fraud').toString()).toBe('/case-management/fraud');
  });
});

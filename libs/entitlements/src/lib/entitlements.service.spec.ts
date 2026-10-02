import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ENTITLEMENTS_URL, EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  let service: EntitlementsService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(EntitlementsService);
    http = TestBed.inject(HttpTestingController);
  });

  it('treats an undefined entitlement as allowed', () => {
    expect(service.has(undefined)).toBe(true);
    expect(service.has('fraud:view')).toBe(false);
  });

  it('loads entitlements and flags from the API', async () => {
    const done = service.load();
    http.expectOne(ENTITLEMENTS_URL).flush({ entitlements: ['fraud:view'], featureFlags: { newQueue: true } });
    await done;
    expect(service.loaded()).toBe(true);
    expect(service.has('fraud:view')).toBe(true);
    expect(service.isEnabled('newQueue')).toBe(true);
    expect(service.isEnabled('other')).toBe(false);
  });
});

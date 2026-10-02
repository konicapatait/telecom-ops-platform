import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { expectHttpErrors, httpLoggingInterceptor } from './http-logging.interceptor';

describe('httpLoggingInterceptor', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpLoggingInterceptor])), provideHttpClientTesting()],
    }),
  );
  afterEach(() => vi.restoreAllMocks());

  it('warns on unexpected failures', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(HttpClient)
      .get('/api/x')
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController).expectOne('/api/x').flush({}, { status: 500, statusText: 'err' });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('HTTP 500 GET /api/x'),
      expect.objectContaining({ durationMs: expect.any(Number) }),
    );
  });

  it('does not warn for statuses the caller expects', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.inject(HttpClient)
      .get('/api/y', { context: expectHttpErrors(404) })
      .subscribe({ error: () => undefined });
    TestBed.inject(HttpTestingController).expectOne('/api/y').flush({}, { status: 404, statusText: 'nf' });
    expect(warn).not.toHaveBeenCalled();
  });
});

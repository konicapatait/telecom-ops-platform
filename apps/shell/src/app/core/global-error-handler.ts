/**
 * @file Global ErrorHandler for the whole page: logs unexpected errors and shows one toast (ADR-0025).
 */
import { ErrorHandler, Injectable, inject } from '@angular/core';
import { DsNotificationService } from '@org/design-system';
import { RemoteLoadError } from '@platform/mf-manifest';
import { LoggerService } from '@platform/utils';

/**
 * Last-resort error boundary for the whole page (shell + every remote share this injector).
 * Remote load failures are already handled in place by the section-unavailable fallback, so they are only logged.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);
  private readonly toasts = inject(DsNotificationService);

  handleError(error: unknown): void {
    const err = (error as { rejection?: unknown })?.rejection ?? error;
    if (err instanceof RemoteLoadError) {
      // Already logged (with code, hint, traceId) by the loader; the UI shows the in-place fallback.
      this.logger.debug(
        'Unhandled remote load error reached the global handler',
        { traceId: err.traceId, remote: err.remote },
        'global',
      );
      return;
    }
    this.logger.error(err instanceof Error ? err.message : String(err), { stack: (err as Error)?.stack }, 'global');
    this.toasts.show('Something went wrong. The team has been notified.', 'danger');
  }
}

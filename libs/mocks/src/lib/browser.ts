/**
 * @file startMockWorker(): starts ONE MSW service worker for the page; failures are logged and the app still boots.
 */
import { RequestHandler } from 'msw';
import { setupWorker } from 'msw/browser';
import { createLogger } from '@platform/utils';

const log = createLogger('mocks');

/**
 * Starts ONE service worker for the page. Call before the app bootstraps so the first request is mocked.
 * Requests without a handler (remoteEntry.json, chunks, fonts) pass straight through.
 */
export async function startMockWorker(handlers: RequestHandler[]): Promise<boolean> {
  const worker = setupWorker(...handlers);
  try {
    await worker.start({
      onUnhandledRequest: (req, print) => {
        if (new URL(req.url).pathname.startsWith('/api')) print.warning();
      },
      serviceWorker: { url: '/mockServiceWorker.js' },
      quiet: true,
    });
  } catch (err) {
    // Keep the app booting (chrome, nav, fallbacks still work); API calls will fail visibly instead.
    // Typical causes: browser without service-worker support, private mode, or a non-localhost http origin.
    log.error('MSW could not start: API calls will NOT be mocked', { reason: String(err) });
    return false;
  }
  log.info('MSW active: all /api calls are mocked', { handlers: handlers.length });
  return true;
}

import { vi } from 'vitest';

vi.mock('@angular-architects/native-federation', () => ({
  loadRemoteModule: vi.fn(async ({ remoteName }: { remoteName: string }) => {
    if (remoteName === 'mfe-down') throw new TypeError('Failed to fetch');
    return { default: [{ path: '' }] };
  }),
}));
vi.mock('@platform/contracts', () => ({ isRemoteName: () => true }));

import { getRemoteLoadRecords } from './diagnostics';
import { RemoteLoadError, loadRemoteRoutes } from './load-remote';
import { setRemoteManifest } from './manifest';

describe('loadRemote tracing', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    setRemoteManifest({
      'mfe-up': 'http://localhost:1/remoteEntry.json',
      'mfe-down': 'http://localhost:2/remoteEntry.json',
    });
  });

  it('records a successful load with a trace id and duration, then as cached', async () => {
    await loadRemoteRoutes('mfe-up' as never);
    await loadRemoteRoutes('mfe-up' as never);
    const recs = getRemoteLoadRecords().filter((r) => r.remote === 'mfe-up');
    expect(recs.map((r) => r.outcome)).toEqual(['loaded', 'cached']);
    expect(recs[0].traceId).toMatch(/^mfe-\d+$/);
    expect(recs[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('classifies, records and warns on failure', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = await loadRemoteRoutes('mfe-down' as never).catch((e) => e);
    expect(error).toBeInstanceOf(RemoteLoadError);
    expect(error.code).toBe('REMOTE_ENTRY_UNREACHABLE');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('Remote failed to load'),
      expect.objectContaining({
        remote: 'mfe-down',
        code: 'REMOTE_ENTRY_UNREACHABLE',
        remoteEntry: 'http://localhost:2/remoteEntry.json',
      }),
    );
    expect(getRemoteLoadRecords().at(-1)).toMatchObject({
      remote: 'mfe-down',
      outcome: 'failed',
      code: 'REMOTE_ENTRY_UNREACHABLE',
    });
  });

  it('flags a remote missing from the manifest', async () => {
    const error = await loadRemoteRoutes('mfe-missing' as never).catch((e) => e);
    expect(error.code).toBe('NOT_IN_MANIFEST');
  });
});

/**
 * URL flags for any mock session:
 *   ?mockDelay=800                      add latency to every mocked API call
 *   ?mockFail=mfe-cap-attachments       make that remote fail to load (comma-separated list allowed)
 *   ?mockFail=/api/cases                make API calls whose path starts with this fail with 500
 */
function params(): URLSearchParams {
  return typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
}

export function mockDelayMs(): number {
  const v = Number(params().get('mockDelay'));
  return Number.isFinite(v) && v > 0 ? Math.min(v, 30000) : 0;
}

export function mockFailures(): string[] {
  return (params().get('mockFail') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function mockDelay(): Promise<void> {
  const ms = mockDelayMs();
  if (ms) await new Promise((r) => setTimeout(r, ms));
}

export function shouldFailRemote(remote: string): boolean {
  return mockFailures().includes(remote);
}

export function shouldFailApi(path: string): boolean {
  return mockFailures().some((f) => f.startsWith('/') && path.startsWith(f));
}

/**
 * @file Federation diagnostics: classify remote-load failures and keep a history of every load (ADR-0025).
 *
 * Troubleshooting flow for "a section/tab/panel says unavailable":
 *   1. Console: look for `WARN federation Remote failed to load` → it carries `code`, `hint`, `remoteEntry`, `traceId`.
 *   2. Run `platformDiagnostics()` in the console for the full load history, manifest and session id.
 *   3. Turn on detail with `?logLevel=debug` (start/cached/preload events per remote).
 * See docs/guides/troubleshooting.md for what each code means and how to fix it.
 */
import type { RemoteName } from '@platform/contracts';

export type RemoteErrorCode =
  | 'NOT_IN_MANIFEST'
  | 'REMOTE_ENTRY_UNREACHABLE'
  | 'EXPOSED_MODULE_MISSING'
  | 'MODULE_IMPORT_FAILED'
  | 'NO_EXPORT'
  | 'SIMULATED'
  | 'UNKNOWN';

export const REMOTE_ERROR_HINTS: Record<RemoteErrorCode, string> = {
  NOT_IN_MANIFEST:
    "The remote has no entry in this environment's mf-manifest.json. Deploy it (deploy-app.mjs writes the entry) or check the remote name.",
  REMOTE_ENTRY_UNREACHABLE:
    'remoteEntry.json could not be fetched. Is the remote running/deployed at that URL? Check CORS on the CDN and the manifest URL.',
  EXPOSED_MODULE_MISSING:
    "The deployed remote does not expose this module. Compare its federation.config.js 'exposes' with the caller; run contract-smoke.mjs.",
  MODULE_IMPORT_FAILED:
    'remoteEntry.json loaded but the module code failed to import. Check shared-dependency versions (strictVersion), tsconfig path mappings (ADR-0008) and stale CDN caches.',
  NO_EXPORT: 'The module loaded but has no usable export (default Routes / a component class). Check the exposed file.',
  SIMULATED: 'Simulated with ?mockFail=<remote> (mock builds only).',
  UNKNOWN: 'Unclassified. See `reason` and the browser network tab for this remote.',
};

/** Maps a raw failure to a stable code. Messages come from Native Federation, es-module-shims and our loaders. */
export function classifyRemoteError(reason: unknown): RemoteErrorCode {
  const text = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  if (/Simulated failure/i.test(text)) return 'SIMULATED';
  if (/not in this environment's manifest/i.test(text)) return 'NOT_IN_MANIFEST';
  if (/Unknown exposed module/i.test(text)) return 'EXPOSED_MODULE_MISSING';
  if (/No (Routes|component) export/i.test(text)) return 'NO_EXPORT';
  if (/Unable to resolve specifier|dynamically imported module|importShim|SyntaxError/i.test(text))
    return 'MODULE_IMPORT_FAILED';
  if (
    /Failed to fetch|NetworkError|Load failed|ERR_|remoteEntry|unknown remote|Error loading remote entry|JSON/i.test(
      text,
    )
  ) {
    return 'REMOTE_ENTRY_UNREACHABLE';
  }
  return 'UNKNOWN';
}

export interface RemoteLoadRecord {
  traceId: string;
  remote: RemoteName;
  exposedModule: string;
  remoteEntry?: string;
  /** ISO 8601 */
  startedAt: string;
  durationMs: number;
  outcome: 'loaded' | 'cached' | 'failed' | 'preloaded' | 'preload-failed';
  code?: RemoteErrorCode;
  reason?: string;
}

const MAX_RECORDS = 200;
const records: RemoteLoadRecord[] = [];
let traceSeq = 0;

export function nextTraceId(): string {
  return `mfe-${++traceSeq}`;
}

export function recordRemoteLoad(record: RemoteLoadRecord): void {
  records.push(record);
  if (records.length > MAX_RECORDS) records.shift();
}

/** Newest last. */
export function getRemoteLoadRecords(): readonly RemoteLoadRecord[] {
  return records;
}

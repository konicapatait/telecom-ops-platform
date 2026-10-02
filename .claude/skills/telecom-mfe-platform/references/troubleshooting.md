# Troubleshooting remote loads (ADR-0025)

## Where the logs come from
| Source | Emits |
| --- | --- |
| `federation` (`libs/mf-manifest/src/lib/load-remote.ts`) | INFO `Remote loaded` (first time), DEBUG cached/preload, **WARN `Remote failed to load` {traceId, remote, exposedModule, remoteEntry, code, hint, reason, durationMs}** |
| `shell` | INFO `Shell started` {remotes, manifestMs, initFederationMs, bootstrapMs}, ERROR manifest unavailable, `Session started`, `Section unavailable` / `Retrying section` |
| `case-management` | `Domain tab unavailable` / `Retrying domain tab` |
| `case-workspace` | `Case tab ready` (debug) / `Case tab unavailable` {tab, remote, caseId, traceId} |
| `layout-360` | `360 panel ready` (debug) / `360 panel unavailable` |
| `router` | ERROR `Navigation failed`, INFO `Slow navigation` (> 1.5 s), DEBUG start/end |
| `http` | WARN failed API calls with `correlationId` |
| `mocks` | MSW active / could not start |

## Procedure
1. Find the WARN `Remote failed to load`, read `code` and `hint` (table in `docs/guides/troubleshooting.md`).
2. Use its `traceId` to find where it surfaced (the host's WARN).
3. `platformDiagnostics()` gives `failures`, `loads`, `manifest` and `sessionId`. `?logLevel=debug` gives full detail.
4. Reproduce locally:
   - `?mockFail=<remote>` (SIMULATED)
   - Playwright `context.route(remoteFiles(remote, port), r => r.abort())` (REMOTE_ENTRY_UNREACHABLE)
   - remove the manifest entry (NOT_IN_MANIFEST)

## When adding code
- New host that loads remote code? Use the loaders. Then log `<what> unavailable` at WARN with the ids, including `traceId` from the `RemoteLoadError`, and `<what> ready` at DEBUG with `durationMs`.
- New boot step? Time it and add it to the `Shell started` context.
- A new failure mode? Add a pattern to `classifyRemoteError` + `REMOTE_ERROR_HINTS`, a case in `diagnostics.spec.ts`, and a row in the troubleshooting guide.

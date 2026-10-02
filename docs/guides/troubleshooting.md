# Troubleshooting

Logging and tracing are described in ADR-0025.

## 1. "This section / tab / panel is unavailable"
1. Open DevTools → Console. Find the line:
   ```
   [platform] 14:05:01.123 WARN  federation     Remote failed to load  { traceId: 'mfe-7', remote: 'mfe-cap-attachments', code: 'REMOTE_ENTRY_UNREACHABLE', hint: '…', remoteEntry: 'https://…/remoteEntry.json', reason: 'TypeError: Failed to fetch' }
   ```
   The next WARN with the same `traceId` says **where** it surfaced, e.g. `case-workspace Case tab unavailable { tab: 'attachments', caseId: … }`.
2. Act on the `code`:

| Code | Meaning | Fix |
| --- | --- | --- |
| `NOT_IN_MANIFEST` | The environment's `mf-manifest.json` has no entry for the remote | Deploy the remote (`deploy-app.mjs` writes the entry) or fix the name; locally, regenerate the entry with the generator |
| `REMOTE_ENTRY_UNREACHABLE` | `remoteEntry.json` could not be fetched | Is the remote running or deployed at that URL? Check CORS on the CDN, the URL in the manifest, and VPN/proxy. Locally: `npm run start:all`. |
| `EXPOSED_MODULE_MISSING` | The deployed remote does not expose that module | Compare `apps/<remote>/federation.config.js` `exposes` with the caller's config (`CaseTabDefinition.exposedModule`, `Section360`); run `contract-smoke.mjs`; redeploy |
| `MODULE_IMPORT_FAILED` | Entry loaded, code failed to import | Shared-dependency mismatch (`strictVersion`), a tsconfig path that is a sub-path of a shared mapping (ADR-0008), or a stale CDN cache; run `npm run check:shared-config` |
| `NO_EXPORT` | Module has no default Routes or component class | Check the exposed file's `export default` |
| `SIMULATED` | `?mockFail=<remote>` in the URL | Remove the flag |
| `UNKNOWN` | Not classified | Read `reason`, then the Network tab for that remote's files |

3. Click **Retry** on the fallback. It reloads in place, and you'll see a new `traceId`.

## 2. More detail
- `?logLevel=debug` (sticks across reloads; reset with `?logLevel=info`). This adds start, cached and preload events for every remote, navigation timings, and tab/panel "ready" lines with durations.
- `platformDiagnostics()` in the console:
  ```js
  platformDiagnostics()            // sessionId, logLevel, app/build/env, manifest, failures (+hints), slowest loads
  platformDiagnostics().loads      // every remote load: traceId, remote, module, remoteEntry, durationMs, outcome, code
  platformDiagnostics().setLogLevel('debug')
  ```
- DevTools → Performance: each remote load is a `mfe <remote> <module>` measure.

## 3. API problems
Every `/api` call has an `X-Correlation-Id` header. Failed calls are logged as `WARN http HTTP 500 GET /api/…  { correlationId }`. Give the correlation id to the backend team.

## 4. Boot problems
| Log line | Meaning |
| --- | --- |
| `ERROR shell Remote manifest unavailable …` | `mf-manifest.json` missing or unreachable: no remote can load this session. Check the deploy of the shell environment. |
| `ERROR mocks MSW could not start …` | Mock build in a browser without service workers (some embedded webviews). Use Chrome or Edge. |
| `ERROR shell Entitlements failed to load …` | The user will see no sections. Check `/api/me/entitlements`. |
| `ERROR router Navigation failed …` | A route guard or resolver threw. See `reason`. |
| `INFO router Slow navigation …` | Over 1.5 s. Usually a slow remote (look for its `Remote loaded … durationMs`) or API. |
| `[platform] FATAL shell failed to start` | Thrown before the logger existed (e.g. `initFederation`). See the error. |

## 5. Reports look wrong or empty
| Symptom | Check |
| --- | --- |
| "No case domain selected" | the `groups` query param is `none`; tick a domain |
| "No cases in this period" | the `from`/`to` range has no weekly data (mock data runs Apr 6 – Sep 28, 2026); widen it |
| "Reports could not be loaded" | `WARN reporting Report data failed to load {report, status}`: 403 = missing `reports:view`, 400 = invalid range |
| Numbers differ between tiles and table | should be impossible (one aggregation, `report-math.ts`); file a bug with the URL |

## 6. What to put in a ticket
`sessionId` (from `platformDiagnostics()`), the time, the WARN/ERROR lines with their `traceId` or `correlationId`, the URL, and the persona or user. Never paste tokens.

## 7. Local development
See the troubleshooting table in [local-development.md](local-development.md) (Node/npm versions, cold-start E2E, service workers).

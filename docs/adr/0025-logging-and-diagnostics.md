# ADR-0025: Structured logging, traced remote loads and a console diagnostics helper

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** request: "add appropriate loggers for troubleshooting MFE loads and the ability to trace the issue effectively"

## Context
With 16 independently deployed remotes, "a tab says unavailable" can have many causes: the remote is missing from the manifest, its server is down or blocked by CORS, an exposed module was renamed, a shared-dependency or import-map problem, or a code bug. Before this, failures were logged ad hoc and could not be correlated.

## Decision
1. **One logger:** `createLogger(source)` in `@platform/utils` (framework-agnostic) and `LoggerService` (Angular facade). Both use one pipeline and one line format:
   `[platform] HH:MM:SS.mmm LEVEL source message {context}`. Every entry carries a per-page-load **`sessionId`**.
2. **Runtime level switch, no rebuild:** `?logLevel=debug` (persisted in `localStorage['platform.logLevel']`) or `platformDiagnostics().setLogLevel('debug')`. Default `info`.
3. **Backend sink:** warn and error entries go to `LOG_ENDPOINT` (from runtime `app-config.json`) via `sendBeacon`. Telemetry can never break the page.
4. **Every remote load is traced** (`@platform/mf-manifest`, the only loader):
   - a trace id (`mfe-N`), a duration, and a `performance.measure('mfe <remote> <module>')` visible in DevTools → Performance
   - on failure, a **classified code** with a **fix hint**: `NOT_IN_MANIFEST`, `REMOTE_ENTRY_UNREACHABLE`, `EXPOSED_MODULE_MISSING`, `MODULE_IMPORT_FAILED`, `NO_EXPORT`, `SIMULATED`, `UNKNOWN`, plus the `remoteEntry` URL
   - log policy: first successful load → INFO; cached repeats and preloads → DEBUG; each failure → WARN (once per attempt)
   - a history of the last 200 loads in a ring buffer
5. **Where a failure surfaced** is logged by the UI host that shows the fallback, with the same `traceId`: "Section unavailable" (shell), "Domain tab unavailable" (hub), "Case tab unavailable" (case-workspace), "360 panel unavailable", "Embedded capability unavailable". Retries are logged too.
6. **Boot and session:**
   - the shell logs one "Shell started" line with manifest, initFederation and bootstrap timings
   - an ERROR if the manifest itself is unavailable
   - "Session started" (user id, entitlement count, never tokens)
   - router errors, plus navigations slower than 1.5 s
   - MSW start or failure
7. **`platformDiagnostics()`** in the browser console (installed by the shell and every standalone harness, read-only, no secrets) returns: session id, log level, app/build/env, manifest, every load, failures with hints, the slowest loads, and `setLogLevel`.
8. **API correlation (unchanged, documented):** every `/api` call carries `X-Correlation-Id`; failed calls are logged with it (`http` source).

## Consequences
- Troubleshooting is a fixed procedure (`docs/guides/troubleshooting.md`): find the WARN line, read `code` and `hint`, and quote `sessionId` and `traceId` in tickets.
- Code must use the platform logger, not `console.*` (review rule, in the skill).

# Local development

## Prerequisites
- **Node 22** (`nvm use`; Angular 21 refuses Node < 20.19) and **npm 11** (`npm i -g npm@11`). npm 10.9 crashes on this dependency tree ([ADR-0010](../platform-handbook.md#adr-0010)).
- Google Chrome for E2E (`PW_CHANNEL=chrome`), or `npx playwright install chromium`.

```bash
npm ci
npm run start:all        # shell :4200 + every remote on its own port (from the local manifest)
```

Open http://localhost:4200. You are signed in as a mock persona. Switch personas in the header.

| Task | Command |
| --- | --- |
| Shell only (remotes not running → their sections show "unavailable") | `nx serve shell` |
| One remote standalone, in its dev harness on mocks | `nx serve mfe-fraud` → http://localhost:4201 |
| Unit tests (all / one) | `npm run test:all` / `nx test shell` |
| Lint, including architecture boundaries | `npm run lint:all` |
| Production build of everything | `npm run build:all` |
| Mock build (what the dev environment runs) | `nx run-many -t build -c mock --projects=tag:type:app` |
| Composed E2E (starts servers if needed) | `PW_CHANNEL=chrome npm run e2e` |
| Architecture checks | `npm run check:shared-config` · `npm run check:no-mocks` (after a production build) |
| Project graph | `nx graph` |

## Mock-mode URL flags
`?mockDelay=800` adds latency to every mocked API call. `?mockFail=mfe-fraud` makes that remote fail. `?mockFail=/api/cases` fails that API path with a 500. See [mocks-and-personas.md](mocks-and-personas.md).

## Ports
Ports come from `libs/mf-manifest/manifests/local/mf-manifest.json`. The generator assigns the next free one. The shell is always 4200.

## Logs and diagnostics
`?logLevel=debug` for detailed platform logs, `platformDiagnostics()` in the console for a session summary. See [troubleshooting.md](troubleshooting.md).

## Troubleshooting
| Symptom | Cause / fix |
| --- | --- |
| Blank page, console: `Unable to resolve specifier '@platform/...'` | A tsconfig path that starts with a shared mapping's name (e.g. `@platform/auth/x`). Use a non-prefix name ([ADR-0008](../platform-handbook.md#adr-0008)). Run `rm -rf .angular && nx reset` after changing paths. |
| `[mocks] MSW could not start` | The browser has no service-worker support (some embedded webviews, private windows). Use Chrome or Edge. |
| `npm error ... reading 'edgesOut'` | You are on npm 10. Upgrade to npm 11. |
| `Unsupported engine` | Wrong Node. Run `nvm use`. |

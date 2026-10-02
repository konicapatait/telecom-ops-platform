# ADR-0010: Toolchain pins (Node 22, npm 11, Nx 23.2, Angular 21.2 zoneless, Native Federation 21.2, Vitest 4 via Analog)

- **Status:** Accepted
- **Date:** 2026-10-02

## Decision
| Tool | Version | Why |
| --- | --- | --- |
| Node | 22 LTS (`.nvmrc`, `engines`) | Angular 21 needs ≥ 20.19 or ≥ 22.12. The development machine had 20.18. |
| npm | 11 | npm 10.9 crashes (`Cannot read properties of null (reading 'edgesOut')`) resolving Vitest 4's optional peer set. npm 11 also gates install scripts. The approved ones are listed in `package.json` → `allowScripts`. |
| Nx | 23.2.1 | Matches the team's earlier workspace. Inferred `lint`/`test` targets. |
| Angular | 21.2.25 framework / 21.2.24 CLI | The plan specifies Angular 21. Angular 22 exists, and moving to it is a later, coordinated upgrade together with Native Federation 22. |
| @angular-architects/native-federation | 21.2.6 | Matches Angular 21. esbuild-based. |
| Vitest | 4.1.11 with `@analogjs/vitest-angular` 2.6.3 | Zoneless TestBed (`tools/vitest/test-setup.ts`). One config factory (`tools/vitest/angular-vitest.config.mts`). |
| Playwright | 1.63 | Composed E2E. Locally `PW_CHANNEL=chrome` uses the installed Chrome. |
| MSW | 2.15 | v3 exists. Upgrading is a separate task (handler API changes). |
| TypeScript | 5.9.3 | Within Angular 21's supported range (`>=5.9 <6.1`). |

All versions are exact (`save-exact`). Upgrades go through Renovate (`renovate.json`): Angular, Native Federation and Nx are grouped and upgraded together with `nx migrate`.

## Consequences
- The whole app runs **zoneless** (`provideZonelessChangeDetection`), and every component is `OnPush` (a lint error otherwise).

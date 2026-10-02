# mfe-partner-view

Domain remote for **Agent full profile** (family: `360`). It exposes `./Routes`, and the shell mounts it at `/agent-full-profile`.
Users need the `partner360:view` entitlement to see it.

|              |                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:360`, `kind:domain`                                                               |
| Local port   | 4215                                                                                                  |
| Standalone   | `nx serve mfe-partner-view` → http://localhost:4215 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/agent-full-profile                                        |
| Build        | `nx build mfe-partner-view` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-partner-view` |

## Rules

- Import only `scope:shared` libs and `libs/layout-360`. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

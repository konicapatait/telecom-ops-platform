# mfe-reporting

Domain remote for **Reports** (family: `reporting`). It exposes `./Routes`, and the shell mounts it at `/reports`.
Users need the `reports:view` entitlement to see it.

|              |                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:reporting`, `kind:domain`                                                      |
| Local port   | 4216                                                                                               |
| Standalone   | `nx serve mfe-reporting` → http://localhost:4216 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/reports                                                |
| Build        | `nx build mfe-reporting` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-reporting` |

## Rules

- Import only `scope:shared` libs. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

# mfe-fraud

Domain remote for **Fraud** (family: `case`). It exposes `./Routes`, and the shell mounts it at `/fraud`.
Users need the `fraud:view` entitlement to see it.

|              |                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:domain`                                                       |
| Local port   | 4201                                                                                           |
| Standalone   | `nx serve mfe-fraud` → http://localhost:4201 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/fraud                                              |
| Build        | `nx build mfe-fraud` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-fraud` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

# mfe-service-assurance

Domain remote for **Service assurance** (family: `case`). It exposes `./Routes`, and the shell mounts it at `/assurance`.
Users need the `assurance:view` entitlement to see it.

|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:domain`                                                                   |
| Local port   | 4207                                                                                                       |
| Standalone   | `nx serve mfe-service-assurance` → http://localhost:4207 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/assurance                                                      |
| Build        | `nx build mfe-service-assurance` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-service-assurance` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

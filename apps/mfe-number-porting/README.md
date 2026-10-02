# mfe-number-porting

Domain remote for **Number porting** (family: `case`). It exposes `./Routes`, and the shell mounts it at `/porting`.
Users need the `porting:view` entitlement to see it.

|              |                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:domain`                                                                |
| Local port   | 4208                                                                                                    |
| Standalone   | `nx serve mfe-number-porting` → http://localhost:4208 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/porting                                                     |
| Build        | `nx build mfe-number-porting` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-number-porting` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

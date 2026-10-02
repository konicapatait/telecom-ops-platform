# mfe-partner-oversight

Domain remote for **Partner oversight** (family: `case`). It exposes `./Routes`, and the shell mounts it at `/partners`.
Users need the `partners:view` entitlement to see it.

|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:domain`                                                                   |
| Local port   | 4209                                                                                                       |
| Standalone   | `nx serve mfe-partner-oversight` → http://localhost:4209 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/partners                                                       |
| Build        | `nx build mfe-partner-oversight` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-partner-oversight` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

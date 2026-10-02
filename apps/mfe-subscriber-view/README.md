# mfe-subscriber-view

Domain remote for **Customer full profile** (family: `360`). It exposes `./Routes`, and the shell mounts it at `/customer-full-profile`.
Users need the `subscribers:view` entitlement to see it.

|              |                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:360`, `kind:domain`                                                                  |
| Local port   | 4214                                                                                                     |
| Standalone   | `nx serve mfe-subscriber-view` → http://localhost:4214 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/customer-full-profile                                        |
| Build        | `nx build mfe-subscriber-view` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-subscriber-view` |

## Rules

- Import only `scope:shared` libs and `libs/layout-360`. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

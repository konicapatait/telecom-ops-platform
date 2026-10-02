# mfe-billing-disputes

Domain remote for **Billing disputes** (family: `case`). It exposes `./Routes`, and the shell mounts it at `/disputes`.
Users need the `disputes:view` entitlement to see it.

|              |                                                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:domain`                                                                  |
| Local port   | 4206                                                                                                      |
| Standalone   | `nx serve mfe-billing-disputes` → http://localhost:4206 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200/disputes                                                      |
| Build        | `nx build mfe-billing-disputes` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-billing-disputes` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

# mfe-case-management

Capability remote **Case management**. It exposes `./CaseManagement`: one standalone component with `caseId` and `caseType` inputs.
Case layouts mount it as a tab or panel through `CaseTabDefinition` (`remote: 'mfe-case-management', exposedModule: './CaseManagement'`).

|              |                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:case`, `kind:hub`                                                                    |
| Local port   | 4212                                                                                                     |
| Standalone   | `nx serve mfe-case-management` → http://localhost:4212 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200                                                              |
| Build        | `nx build mfe-case-management` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-case-management` |

## Rules

- Import only `scope:shared` libs and `libs/case-workspace`. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.

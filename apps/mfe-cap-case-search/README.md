# mfe-cap-case-search

Capability remote **Case search**. It exposes `./CaseSearch`: one standalone component with `caseId` and `caseType` inputs.
Case layouts mount it as a tab or panel through `CaseTabDefinition` (`remote: 'mfe-cap-case-search', exposedModule: './CaseSearch'`).

|              |                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:capability`, `kind:capability`                                                       |
| Local port   | 4211                                                                                                     |
| Standalone   | `nx serve mfe-cap-case-search` → http://localhost:4211 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200                                                              |
| Build        | `nx build mfe-cap-case-search` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-cap-case-search` |

## Rules

- Import only `scope:shared` libs. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.
- Never read the route or another MFE's state. Everything you need comes from `caseId` and `caseType` ([ADR-0004](../../docs/platform-handbook.md#adr-0004)).

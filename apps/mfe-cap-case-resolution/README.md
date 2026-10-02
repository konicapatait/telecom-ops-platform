# mfe-cap-case-resolution

Capability remote **Case resolution**. It exposes `./CaseResolution`: one standalone component with `caseId` and `caseType` inputs.
Case layouts mount it as a tab or panel through `CaseTabDefinition` (`remote: 'mfe-cap-case-resolution', exposedModule: './CaseResolution'`).

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| Tags         | `type:app`, `family:capability`, `kind:capability`                                                           |
| Local port   | 4205                                                                                                         |
| Standalone   | `nx serve mfe-cap-case-resolution` → http://localhost:4205 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200                                                                  |
| Build        | `nx build mfe-cap-case-resolution` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-cap-case-resolution` |

## Rules

- Import only `scope:shared` libs. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.
- Never read the route or another MFE's state. Everything you need comes from `caseId` and `caseType` ([ADR-0004](../../docs/platform-handbook.md#adr-0004)).

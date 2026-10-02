# mfe-cap-audit-trail

Capability remote **Audit trail**. It exposes `./AuditTrail`: one standalone component with `caseId` and `caseType` inputs.
Case layouts mount it as a tab or panel through `CaseTabDefinition` (`remote: 'mfe-cap-audit-trail', exposedModule: './AuditTrail'`).

|              |                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:capability`, `kind:capability`                                                       |
| Local port   | 4202                                                                                                     |
| Standalone   | `nx serve mfe-cap-audit-trail` → http://localhost:4202 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200                                                              |
| Build        | `nx build mfe-cap-audit-trail` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-cap-audit-trail` |

## Rules

- Import only `scope:shared` libs. Never another app ([ADR-0002](../../docs/platform-handbook.md#adr-0002)).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.
- Never read the route or another MFE's state. Everything you need comes from `caseId` and `caseType` ([ADR-0004](../../docs/platform-handbook.md#adr-0004)).

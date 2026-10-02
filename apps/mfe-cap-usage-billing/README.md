# mfe-cap-usage-billing

Capability remote **Usage &amp; billing**. It exposes `./UsageBilling`: one standalone component with `caseId` and `caseType` inputs.
Case layouts mount it as a tab or panel through `CaseTabDefinition` (`remote: 'mfe-cap-usage-billing', exposedModule: './UsageBilling'`).

|              |                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------- |
| Tags         | `type:app`, `family:capability`, `kind:capability`                                                         |
| Local port   | 4203                                                                                                       |
| Standalone   | `nx serve mfe-cap-usage-billing` → http://localhost:4203 (dev harness on mocks)                            |
| In the shell | `npm run start:all` → http://localhost:4200                                                                |
| Build        | `nx build mfe-cap-usage-billing` (production), `-c mock` (dev environment)                                 |
| Pipeline     | [`.gitlab-ci.yml`](./.gitlab-ci.yml). To run on its own: start a pipeline with `APP=mfe-cap-usage-billing` |

## Rules

- Import only `scope:shared` libs. Never another app (ADR-0002).
- No global CSS. Use `@org/design-system` components and `--ds-*` tokens.
- `@platform/mocks` may be imported only from `src/start-mocks.ts` and specs.
- Never read the route or another MFE's state. Everything you need comes from `caseId` and `caseType` (ADR-0004).

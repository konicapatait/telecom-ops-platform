# Mocks and personas

The mocks setup is described in [ADR-0006](../platform-handbook.md#adr-0006).

```
libs/mocks/src/
  personas.ts          Analyst · Supervisor · Auditor (+ entitlements)
  fixtures/            cases.ts (HERO_CASES + seeded generateCases), seeded-random.ts
  fixtures/            + usage.ts, attachments.ts, audit.ts, fraud.ts   (also importable as @platform/mocks/fixtures in specs)
  handlers/            identity · case · usage · attachment · audit · fraud
  lib/mock-db.ts       mutable state for the session: upload → appendAudit (resetMockDb() in tests)
  lib/http-errors.ts   forbidden / notFound / simulatedFailure / has(persona, entitlement)
  lib/browser.ts       startMockWorker(handlers): one service worker per page
  lib/mock-flags.ts    ?mockDelay / ?mockFail
  lib/api-path.ts      api('/x') → '*/api/x' (origin-agnostic)
  node.ts              setupServer for Vitest
libs/auth/mock/        @platform/auth-mock: MockAuthService, provideMockAuth (NOT shared via federation)
```

## Personas
| Persona | Notable entitlements |
| --- | --- |
| Analyst (Priya Natarajan) | all case views, account, usage, attachments view and upload, resolve. No audit. |
| Supervisor (Marcus Lee) | everything, including audit, reassign and reports |
| Auditor (Helen Brandt) | read-only: views, usage, attachments view, **audit**. No upload or resolve. |

The persona travels as `Authorization: Bearer mock.<id>`. Handlers read it with `personaFromRequest(request)`.

## Endpoints and the entitlement each one enforces ([ADR-0019](../platform-handbook.md#adr-0019))
| Method + path | Entitlement | Notes |
| --- | --- | --- |
| `GET /api/me/entitlements` | (signed in) | persona from `Bearer mock.<id>` |
| `GET /api/cases?domain&status&page&size` | (signed in) | `Page<CaseSummary>` |
| `GET /api/cases/:caseId` | (signed in) | 404 when unknown; logs "Case accessed in view mode" once per user per session |
| `GET /api/fraud/cases/:caseId/overview` | `fraud:view` | 404 for non-fraud cases |
| `GET /api/cases/:caseId/usage` | `case:usage:view` | hero case has 3 flagged events |
| `GET /api/cases/:caseId/attachments` | `case:attachments:view` | |
| `POST /api/cases/:caseId/attachments` (multipart `file`, `category`) | `case:attachments:upload` | appends `ATTACHMENT_ADDED` to audit |
| `GET /api/cases/:caseId/attachments/:id/content` | `case:attachments:view` | |
| `GET /api/cases/:caseId/audit` | `case:audit:view` | read-only; no write endpoint exists |
| `GET /api/cases?q=` | (signed in) | search by case id, account/partner id, name or phone |
| `GET /api/cases?subjects=ACC-1,DLR-2` | (signed in) | only cases about these subjects (Case management customer focus) |
| `GET /api/accounts/:id` · `GET /api/accounts/:id/usage` | `subscribers:view` or `case:account:view` · `case:usage:view` | 360 panels by account id |
| `GET /api/reports/case-volume` · `GET /api/reports/sla` `?domains=&from=&to=` | `reports:view` | weekly series per domain; 400 for a bad range |
| `GET /api/partners/:id` | `partner360:view` | `PartnerProfile` with linked subscribers |
| `GET /api/customers?q=` · `GET /api/customers/:id` | (signed in) | `CustomerSummary`: details, linked subjects, open cases per domain |
| `GET /api/cases/:caseId/account` | `case:account:view` | 404 for partner cases |
| `GET /api/cases/:caseId/resolution` | (signed in) | 404 while open |
| `POST /api/cases/:caseId/resolution` `{ code, note? }` | `case:resolve` | 422 for another domain's code, 409 if already closed; closes the case and appends `CASE_RESOLVED` |
| `GET /api/{disputes,assurance,porting,partners}/cases/:caseId/overview` | `{disputes,assurance,porting,partners}:view` | 404 for other domains' cases |

## Adding a handler
```ts
// libs/mocks/src/handlers/usage.handlers.ts
export const usageHandlers = [
  http.get(api('/cases/:caseId/usage'), async ({ params }) => {
    await mockDelay();
    return HttpResponse.json(USAGE_BY_CASE[params['caseId'] as string] ?? []);
  }),
];
```
Add it to `allHandlers` in `handlers/index.ts` and write a spec next to it (Node environment, `server` from `node.ts`).

## Rules
- Fixtures are typed with `@platform/contracts` types. Never use `any`.
- Hero ids never change. Tests and demos depend on them.
- Phone numbers use the fictional 555-01xx range.
- Never import `@platform/mocks` outside `start-mocks.ts` or specs (lint error), and never add new mock-only code to a shared lib ([ADR-0008](../platform-handbook.md#adr-0008)).

## Hero cases (stable ids)
| Case | Domain | Use it for |
| --- | --- | --- |
| `FRD-2026-000142` | Fraud, SIM swap | usage flags, attachments, audit, resolution |
| `BIL-2026-003318` | Billing dispute, roaming | dispute overview, case search ("okafor") |
| `SVC-2026-000311` | Service assurance, dropped calls | KPI panel |
| `NPT-2026-000088` | Number porting, rejected port | failed porting step |
| `PTR-2026-000031` | Partner onboarding, KYC | onboarding journey |
| `PTR-2026-000044` | Partner ongoing, performance | findings |
| `PTR-2026-000057` | Partner field audit, store visit | field-audit journey |

## Audit events (contracts v1.2)
Each event has a `category`: **Tier**, **Stage** or **Subprocess** for workflow moves (`WORKFLOW_MOVED`, with `to`), or **Activity** for actions. It also has a `component` (Workflow, Attachments, Case decision, Case screen …). The hero fraud case walks *New → Readiness Check → Standard Investigation → Ready For Work → Available to Pull*. A decision appends the decision itself plus *Stage → Closed*.

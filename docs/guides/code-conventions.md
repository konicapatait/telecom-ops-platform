# Code conventions

These conventions keep a codebase with many teams and many remotes readable and easy to manage. Lint and the CI guard scripts enforce most of them.

## Files
- **Every source file starts with a header comment** saying what it is for (`npm run check:headers`, CI):
  ```ts
  /**
   * @file Case header: id, status/priority badges and the subject's key facts.
   */
  ```
  One sentence is enough. Add more lines when the file holds a decision or a non-obvious rule, and reference the ADR (`(ADR-0017)`). Generator templates already include headers.
- **Explain *why*, not *what*.** Comments carry decisions, constraints and gotchas (`untracked` is required here because…). Don't narrate obvious code.
- **One concept per file.** Names match content: `case-queue.component.ts` holds `CaseQueueComponent`. Configs as data live in `*.config.ts`, `*.sections.ts` and `*.tabs.ts`.
- **Public API only through `src/index.ts`** of each lib. Never deep-import another project's files.

## Angular
- Standalone components, `ChangeDetectionStrategy.OnPush` (lint error otherwise), signals (`input()`, `computed`, `linkedSignal`, `rxResource`), zoneless-safe.
- Selector prefix per project (lint): `shell-`, `cw-`, `l360-`, `fraud-`, `casemanagement-` …
- Templates over ~40 lines move to a `.html` file; styles use `--ds-*` tokens only (no hard-coded colours) and no global CSS from remotes.

## Logging (ADR-0025)
- Use the platform logger, never `console.*`:
  ```ts
  const log = createLogger('case-workspace');     // plain code
  inject(LoggerService).warn('…', { … }, 'shell'); // Angular code (same pipeline)
  ```
- Message = what happened, in a few words ("Case tab unavailable"). **Context = ids to correlate** (`traceId`, `remote`, `caseId`, `tab`, `durationMs`). Never tokens, passwords or personal data beyond ids.
- Levels: DEBUG detail for developers · INFO one line per meaningful milestone · WARN degraded but working (a fallback is shown) · ERROR the user is blocked.

## Architecture rules
See `.claude/skills/telecom-mfe-platform/SKILL.md` for the rule table (boundaries, shared config, mocks, contracts, families, tabs/sections as configuration) and `docs/adr/` for the reasoning behind each rule.

## Before you push
```bash
npx nx run-many -t lint test build
npm run check:shared-config && npm run check:layouts && npm run check:headers && npm run check:no-mocks
```

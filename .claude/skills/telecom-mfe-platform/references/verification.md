# Verification checklist

| Step | Command | Green looks like |
| --- | --- | --- |
| Lint + boundaries | `npx nx run-many -t lint` | `Successfully ran target lint` (the MSW worker warning is ignored) |
| Unit tests | `npx nx run-many -t test` | all projects pass |
| Shared-config drift | `npm run check:shared-config` | `✔ Shared config OK: N apps …` |
| No layout forks (case + 360) | `npm run check:layouts` | two ✔ lines (case domains, 360 views) |
| File headers | `npm run check:headers` | `✔ Every source file starts with a header comment.` |
| Type-check (Vitest does NOT type-check) | `npx nx run-many -t build` | catches type errors in mocks and specs' imports too |
| Production builds + budgets | `npx nx run-many -t build` | no budget errors |
| Mock firewall | `npm run check:no-mocks` | `✔ No mock code in N production build(s)` |
| Mock builds | `npx nx run-many -t build -c mock --projects=tag:type:app` | success |
| Composed E2E (dev servers) | `npm run start:all`, wait until EVERY port in the local manifest serves `remoteEntry.json`, then `PW_CHANNEL=chrome npx playwright test -c apps/shell-e2e/playwright.config.ts` | all specs pass (41 today) |
| Composed E2E (deployed) | deploy all with `--provider local`, `node tools/ci/serve-env.mjs dev 8080`, `BASE_URL=http://localhost:8080 PW_CHANNEL=chrome npx playwright test -c apps/shell-e2e/playwright.config.ts` | same tests pass |
| Pipeline plan | `APP=<app> node tools/ci/generate-pipeline.mjs` | includes only that app's file |

Visual check: open http://localhost:4200 in Chrome. Mock mode needs service workers, and some embedded browser panes do not support them.

**Charts:** additionally screenshot the dashboard in light and dark (`colorScheme` in the Playwright context) and look for label collisions, wrapping tooltips and wasted headroom. The palette validator checks colour, not layout.

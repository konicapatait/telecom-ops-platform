# Adding a micro-frontend

Always use the generator ([ADR-0015](../platform-handbook.md#adr-0015)).

```bash
# A case domain mounted at /disputes: queue + case screen on libs/case-workspace, config, overview panel
nx g @platform/tools:mfe billing-disputes --kind=domain --family=case --caseDomain=BILLING_DISPUTE \
  --route=disputes --label="Billing disputes" --entitlement=disputes:view --owner=@telecom/billing-team

# A 360 or reporting section
nx g @platform/tools:mfe subscriber-view --kind=domain --family=360 --route=subscribers --label="Customer full profile"

# A capability (tab or panel)
nx g @platform/tools:mfe usage-billing --kind=capability --label="Usage & billing" --exposedName=UsageBilling
```

Add `--dry-run` first to preview. The generator creates and wires:

| What | Where |
| --- | --- |
| App (federation build, three configurations, budgets, dev harness, spec, README) | `apps/<project>/` |
| Its pipeline | `apps/<project>/.gitlab-ci.yml` |
| Typed remote name | `libs/contracts/src/lib/remotes.ts` (`RemoteName`) |
| Local manifest entry (next free port) | `libs/mf-manifest/manifests/local/mf-manifest.json` |
| **Case domain:** a tab on the Case management page | `apps/mfe-case-management/src/app/case-management.tabs.ts` |
| **360 / reporting / hub:** shell nav and route | `apps/shell/src/app/routing/remote-registry.ts` |
| Case family only: `<name>.config.ts` (the four standard case tabs, [ADR-0023](../platform-handbook.md#adr-0023); resolution codes), routes on the shared layout, `./<Name>Overview` (Triggering info) panel | `apps/<project>/src/app/` |
| Owner | `.gitlab/CODEOWNERS` |

## Then
1. `nx serve <project>` and build the first page in the harness.
2. `npm run start:all` to see it inside the shell.
3. Add mock handlers and fixtures in `libs/mocks` (`handlers/<domain>.handlers.ts`, typed fixtures, hero ids for demos).
4. Add the entitlement to the right personas in `libs/mocks/src/personas.ts`.
5. **Case domains:** set real resolution codes (the backend validates them), drop tabs you don't need, build the overview panel, then run `npm run check:case-domains`.
6. **Capabilities:** add a `CaseTabDefinition` to each domain config that should show the tab (Phase 2+). That is config only ([ADR-0005](../platform-handbook.md#adr-0005)).
7. Commit. CI picks the app up automatically through `nx affected`. The first `main` pipeline deploys it to dev and adds it to the dev manifest.

## Removing one
Delete `apps/<project>`, its `RemoteName` entry, its local manifest entry, its shell registry entry and its CODEOWNERS line. Then remove it from each deployed manifest with a rollback-style manifest edit, or simply stop deploying it and delete its entry.

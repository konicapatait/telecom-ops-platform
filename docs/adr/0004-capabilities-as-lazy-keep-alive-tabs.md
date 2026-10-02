# ADR-0004: Capabilities are separately deployed remotes, rendered as lazy, keep-alive tabs

- **Status:** Accepted (tab host in Phase 2; capability generator ready now)
- **Date:** 2026-10-02
- **Source:** Plan decision 4, "Capability tabs on the case screen"

## Decision
- A capability remote (`mfe-cap-*`) exposes **exactly one** standalone component with inputs `caseId` and `caseType` (`CaseCapabilityInputs` in `@platform/contracts`). It fetches its own data and never reads the route or another MFE's state.
- The tab host (Phase 2, `libs/case-workspace`) preloads each visible tab's `remoteEntry.json` when the case resolves. It creates the component on first open and keeps it alive afterwards. A failed remote shows "section unavailable" with Retry **in that tab only**.
- `loadCapability(remote, exposedModule)` in `@platform/mf-manifest` is the single loader. It resolves the default export or the first exported class, and reports failures through `onRemoteFailure`.

## Consequences
- A capability is built and deployed independently. `nx g @platform/tools:mfe <name> --kind=capability` produces the remote, its pipeline and a **dev harness** that renders it with hero fixture cases (`nx serve mfe-cap-<name>`).
- Generated capability code must not import the router. Review enforces this, and the README template states it.

# ADR-0005: Case tabs are typed configuration, not layout code

- **Status:** Accepted (consumed in Phase 2)
- **Date:** 2026-10-02
- **Source:** Plan decision 5

## Decision
Each case domain declares a `CaseDomainConfig` (`@platform/contracts`). It holds the title, the `CaseTabDefinition[]` (id, label, remote, exposedModule, entitlement, order), the resolution tab and the resolution codes. The domain passes it to the shared layout with `provideCaseDomain(...)`. `CaseTabDefinition.remote` is typed as `RemoteName`, a union the generator keeps up to date, so a typo in a remote name fails compilation.

## Consequences
- Adding a tab to Fraud is a one-line config change in `mfe-fraud`. That is the Phase 3 gate.
- Domain-owned panels (for example Fraud overview) also go through the tab host by pointing `remote` at the domain's own remote, so domain and capability panels behave alike.
- Contract changes are **additive only** and need platform-owner review (CODEOWNERS on `libs/contracts`).

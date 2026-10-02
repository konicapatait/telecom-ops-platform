# ADR-0023: Every case screen has four tabs: Case decision · Triggering info · Audit log · Attachments

- **Status:** Accepted
- **Date:** 2026-10-02
- **Amends:** ADR-0020 (the decision capability moves from the action rail into the first tab), ADR-0005 (standard tab set)
- **Source:** design reference screenshot supplied by the product owner (case screen with tabs *Case Decision, Triggering Info, Customer Outreach, Audit Log, Attachments, Conversations*). The four requested were adopted.

## Decision
1. **Tab set (configuration, every domain):**

   | Tab | Remote · module | Entitlement | Notes |
   | --- | --- | --- | --- |
   | Case decision | `mfe-cap-case-resolution` · `./CaseResolution` (= `CaseDomainConfig.resolution`, `order: 0`) | none | Everyone who can see the case sees the decision. The form needs `case:resolve` (UI and API). Codes still come via `CaseResolutionInputs` (ADR-0020). |
   | Triggering info | the domain's own panel (`./FraudOverview`, …) | none | What raised the case: rule hits, disputed items, KPIs, porting steps, partner findings |
   | Audit log | `mfe-cap-audit-trail` · `./AuditTrail` | `case:audit:view` | Redesigned, see 3 |
   | Attachments | `mfe-cap-attachments` · `./Attachments` | `case:attachments:view` | Partner journeys also say "Attachments" now |

   The case view merges `config.resolution` into the tab list by `order`. There is no action rail any more. Account and Usage tabs were removed from case screens. Re-adding one is a one-entry config change.
2. **Tab styling** comes from the design system: `ds-tabs variant="contained"` (DS 0.2.0), a grey strip with the selected tab as a white card joined to a white panel. No local CSS overrides.
3. **Audit log layout** (matches the reference):
   - live **search** across category, description, component and who
   - **workflow track**: every tier reached, joined by a line. The current tier is emphasised, with the current **stage** and **subprocess** under it (e.g. *Standard Investigation → Ready For Work · Available to Pull*).
   - table **Category · Description · Component · Who** (timestamp under Who), **oldest first**, coloured dot per category (Tier blue, Stage green, Subprocess red, Activity grey)
   - events with identical timestamps keep the backend's order
4. **Contracts v1.2 (additive):** `AuditEvent.category` (`TIER | STAGE | SUBPROCESS | ACTIVITY`, default ACTIVITY), `.component`, `.to`. New actions `WORKFLOW_MOVED` and `CASE_ACCESSED`. The backend (mocks today) records workflow moves, "Case accessed in view mode" (once per user per case per session), and on a decision both the decision (*Activity · Case decision*) and *Stage → Closed*.

## Consequences
- The generator's case-domain template produces the four tabs.
- `Customer Outreach` and `Conversations` from the reference are **not** built. They would be new capabilities (`nx g … --kind=capability`) plus one config entry each.
- The workflow-track and grey-header table are local to the audit capability for now. Requested from the design-system team (`docs/design-system-requests.md`).

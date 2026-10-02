# @platform/layout-360

The shared 360 layout ([ADR-0002](../../docs/platform-handbook.md#adr-0002), [ADR-0003](../../docs/platform-handbook.md#adr-0003), [ADR-0024](../../docs/platform-handbook.md#adr-0024)). It is a **build-time** library compiled into every 360-family remote (`mfe-subscriber-view`, `mfe-partner-view`). It is **not** a federation shared mapping and **not** a remote. Owned by the customer-360 team (CODEOWNERS).

```html
<l360-layout [profile]="profile()" [kpis]="kpis()" [sections]="SECTIONS" [panelInputs]="{ accountId }">
  <ng-template l360Section="open-cases"> …domain-owned panel… </ng-template>
</l360-layout>
```

| Export                               | What                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Profile360`, `Kpi360`, `Section360` | Banner, KPI strip and section **configuration** (types)                                                                                                                                        |
| `Layout360Component`                 | Banner → KPI strip → responsive section grid (span 1–3)                                                                                                                                        |
| `L360SectionDirective`               | `<ng-template l360Section="id">`: a panel the 360 app renders itself                                                                                                                           |
| `PanelHostComponent`                 | Loads a capability remote into a section, with `panelInputs` (e.g. `{ accountId }`) filtered to what the section asks for. A failed remote shows "unavailable" + Retry **in that panel only**. |

Rules: no HTTP, no domain logic. **No audit log on 360 screens** (resolved decision in the plan).

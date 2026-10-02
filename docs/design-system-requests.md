# Requests to the design-system team

Phase 2 needed a few UI patterns that `@org/design-system` (stub 0.1.x) does not provide yet. The capabilities currently use **semantic native HTML with component-scoped styles on `--ds-*` tokens**. That is acceptable under [ADR-0001](platform-handbook.md#adr-0001) (no global CSS, tokens only), but it duplicates styling across remotes. Each pattern below should become a DS component. When it ships, replace the local markup.

| Pattern | Used in | Proposed component | Must support |
| --- | --- | --- | --- |
| Data table | fraud queue, usage grid, attachments | `ds-table` (+ column defs, row tone, sticky header) | row highlight tone (flagged), numeric alignment, caption, empty state |
| Checkbox / switch | usage "Flagged only" | `ds-checkbox` | label, `model()` value |
| File input | attachments upload | `ds-file-input` | accessible label, accept, drag and drop, single or multiple |
| Meter / score | fraud risk score | `ds-meter` | low/high/optimum bands, value label |
| Timeline | audit trail | `ds-timeline` | icon per event type, timestamp, ordered-list semantics |
| Pager | case queue | `ds-pager` | total, page size, keyboard |
| Radio group | resolution outcome | `ds-radio-group` | fieldset/legend, error message, reactive forms (`ControlValueAccessor`) |
| Textarea / form field | resolution note | `ds-form-field` + `ds-textarea` | label, required marker, error slot, counter |
| Stepper / status list | porting steps | `ds-steps` | done, failed, pending states |
| KPI tile | service KPIs, partner KPIs | `ds-stat` | value, unit, threshold breached state |

| Charts: line + horizontal bar | reports dashboard | `ds-line-chart`, `ds-bar-chart` | the rules in [ADR-0027](platform-handbook.md#adr-0027), charts rules (palette slots, marks, crosshair tooltip, keyboard, legend/direct labels); `mfe-reporting/src/app/charts` is the reference |
| Stat tile | reports, full profiles | `ds-stat` | value, label, status line with icon |
| Workflow / status track | audit log | `ds-status-track` | ordered steps, current step emphasis, sub-status lines under the current step |
| Data table, "contained" header | audit log | `ds-table` variant | grey header band matching `ds-tabs variant="contained"` |

Delivered: **0.2.0** `ds-tabs variant="contained"` (case screens, from the design reference) and block hosts for `ds-nav-list` and `ds-tabs` (fixed unclickable nav links).

Fixed already in DS: 0.1.1 `ds-nav-list` root item exact-match (see `../design-system/CHANGELOG.md`).

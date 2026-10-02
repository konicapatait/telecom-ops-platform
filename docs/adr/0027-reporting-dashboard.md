# ADR-0027: Reporting: one dashboard remote with its own layout, URL-driven filters, accessible SVG charts and CSV export

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Plan Phase 5 (gate: dashboards render from mock series with domain and date filters applied; export to CSV)

## Decision
1. **`mfe-reporting`** (`/reports`, family `reporting`, entitlement `reports:view`) keeps its layout **inside the app** (ADR-0002): filter bar → stat tiles → charts → report table.
2. **Data:** `GET /api/reports/case-volume` and `GET /api/reports/sla` with `?domains=&from=&to=` (contracts v1.4, additive: `CaseVolumePoint`, `SlaPoint`, `ReportQuery`). The mocks serve 26 seeded weeks per case domain (incl. the late-September fraud spike). 400 for bad ranges, 403 without `reports:view`.
3. **Report groups = the five Case management tabs.** The partner journeys are summed into "Partner oversight", so reports speak the same language as the case screens.
4. **Filters:**
   - live in the URL (`?groups=&from=&to=`), so views can be bookmarked and shared
   - sit in one row above everything, date range first (presets 4 / 13 / 26 weeks, then custom)
   - scope tiles, charts, table and export alike (E2E asserts tile totals = table column sums)
   - on refetch, the previous frame stays on screen, dimmed
5. **Charts follow the data-viz method** (no chart library; plain SVG components):
   - Form by job: weekly opened cases = change over time → **line chart**; SLA attainment by domain = category comparison → **horizontal bars** with a dashed 90% target; headline totals → **stat tiles**, not charts.
   - Colour: the reference categorical palette, first five slots, **validated by script** in light (surface #fff) and dark (#1a1e24). Every hard gate passes; adjacent CVD ΔE ≥ 9.1 / 8.4, normal-vision ≥ 19.6 / 19.3. Light-mode contrast relief (3 slots < 3:1) is a legend plus the table view. **One fixed colour per group**, so filtering never repaints survivors.
   - Marks: 2px lines, 4px-rounded bar ends with gaps, recessive grid, one y-axis with "nice" headroom, labels in text colour with a surface halo, a legend for ≥ 2 series, direct end labels (de-collided) for ≤ 4.
   - Interaction: a crosshair snapping to the week with ONE tooltip listing every series (values first); bars as focusable hit targets with their own tooltip; keyboard ←/→/Esc. The table is the non-visual view.
   - Status: "Below 90% target" uses the warning colour **plus an icon and label**.
6. **CSV export** (RFC 4180) downloads exactly the rows in the table: `case-report_<from>_<to>.csv`.
7. **Logging:** `reporting` source, with "Report data loaded" timings, a warning on failure, and "Report exported as CSV".

## Consequences
- A chart component is requested from the design-system team (`docs/design-system-requests.md`). These SVG charts are the reference implementation until it exists.
- E2E: `apps/shell-e2e/src/phase-5-reporting.spec.ts` (5 tests).

# ADR-0002: Layouts belong to layout families; the shell owns only the app chrome

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Plan decision 2, "Layout model"

## Context
The platform has three kinds of screens with different layouts: case management (queue, case header, tab bar, action rail), 360 views (profile banner, KPI strip, section grid) and reporting (filter bar, dashboard grid). A single shell-owned layout would force tab bars onto 360 and reporting screens. Per-app layouts would fork the case screen five times.

## Decision
Layouts nest in three levels:

1. **App chrome:** owned by `apps/shell`. Header, global search, left nav, notifications, persona switcher in mock mode. Nothing below the chrome.
2. **Family layout:** `libs/case-workspace` (case family), `libs/layout-360` (360 family). Reporting keeps its layout inside `mfe-reporting`.
3. **Page content:** domain and capability remotes.

Each remote carries a `family:*` tag. ESLint (`@nx/enforce-module-boundaries`) lets an app import only `scope:shared` libs plus **its own family's** layout lib.

## Consequences
- The shell stays thin and rarely redeploys.
- A family-layout change rebuilds every app in that family (Nx `affected` flags them).
- Phase 0–1 created only the shell chrome. The family layout libs arrive in Phase 2 (case) and Phase 4 (360). Their tags and CODEOWNERS entries already exist.

## Alternatives considered
- **Shell owns all layouts:** 360 and reporting would inherit case chrome they do not want. Rejected.
- **Each app owns its layout:** guarantees drift across the five case domains. Rejected.

# ADR-0003: Family layouts are build-time libraries, not remotes

- **Status:** Accepted (implementation in Phase 2 / Phase 4)
- **Date:** 2026-10-02
- **Source:** Plan decision 3

## Context
The case screen is the most-used screen. Its layout changes rarely and the changes are design-led.

## Decision
`libs/case-workspace` and `libs/layout-360` are Nx libs that each family member **compiles in**. They are deliberately **not** federation shared mappings (see `shared.config.js`), so each remote carries its own copy and gets typed inputs.

## Consequences
- No extra runtime fetch on the case screen, and inputs are typed end to end.
- A layout change means rebuilding and redeploying all five case domains. Nx `affected` lists them and the pipeline planner runs them.
- Keep the layout small and slot-based so domain differences stay in configuration (ADR-0005).
- `libs/case-workspace` is owned by the case-management team (`.gitlab/CODEOWNERS`).

## Alternatives considered
- **Layout as a remote:** one more network hop on the hottest screen, and untyped inputs. Rejected.
- **Layout in the shell:** see ADR-0002.

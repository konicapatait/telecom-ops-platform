# telecom-ops-platform: guidance for AI coding agents

Before changing anything here, load the project skill **`.claude/skills/telecom-mfe-platform/SKILL.md`**. It holds the architecture rules, recipes and verification steps.

Non-negotiables (details in `docs/adr/`):
- New apps only via `nx g @platform/tools:mfe` (ADR-0015). Never hand-copy an app.
- Federation shared config lives only in `libs/mf-manifest/src/shared.config.js` (ADR-0008).
- `@platform/mocks` and `@platform/auth-mock` only in `src/start-mocks.ts` and specs (ADR-0006).
- `libs/contracts` changes are additive only (ADR-0005).
- The design system is an external package. Never fork its components into this repo (ADR-0001).
- Run tasks through Nx (`npx nx ...`). Node 22 and npm 11 are required.
- Record any new architectural decision as an ADR (`docs/adr/0000-template.md`) and add it to `docs/adr/README.md`.

# ADR-0015: New apps are created only through the workspace generator

- **Status:** Accepted
- **Date:** 2026-10-02
- **Source:** Plan governance rule 4

## Decision
`nx g @platform/tools:mfe <name> --kind=domain|capability [--family=case|360|reporting]` is the only supported way to add a remote. In one step it:
1. creates `apps/<project>` with `project.json` (native-federation `build`/`serve` wrapping `esbuild`/`serve-original`; `production`/`mock`/`development` configurations; budgets; `fileReplacements`), `federation.config.js` (via `withPlatformFederation`), tsconfigs, the Vitest config, the ESLint config, a dev harness, a starter spec and a README
2. writes **its own pipeline** `apps/<project>/.gitlab-ci.yml`
3. adds the name to the `RemoteName` union in `@platform/contracts`
4. adds a local manifest entry on the next free port
5. adds a shell nav and route entry (domain only)
6. appends a CODEOWNERS line (`--owner`)

## Consequences
- Every remote looks the same, so pipelines, tags and manifests stay uniform.
- To change what every new app looks like, edit the templates in `tools/generators/src/generators/mfe/files/`. Existing apps are **not** migrated automatically. Write an Nx migration or update them by hand.

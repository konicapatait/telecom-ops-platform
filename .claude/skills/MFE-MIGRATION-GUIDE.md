# Migrating a modular monolith to micro-frontends with the `mfe-*` skills

A step-by-step guide for developers who use an AI coding agent (Claude Code) with the five `mfe-*` skills. You move an existing Angular modular monolith (the **legacy app**) into a micro-frontend platform:
- a new **shell** project owns Okta sign-in, the header and nav, and loading remotes
- the legacy app is onboarded unchanged as an **isolated remote**
- screens are then replaced one by one by **new remotes** (the strangler pattern)
- everything is hosted on **S3 + CloudFront** and deployed from **GitLab CI**

Each step gives you the goal, a copy-paste prompt, what the agent will ask you, what it produces and what you check before moving on.

---

## 1. What you get

| Skill | The agent uses it when you… | It contains |
| --- | --- | --- |
| `mfe-platform-blueprint` | plan, start, or ask "how do we move X to micro-frontends" | architecture, repo/project structure, phases with gates, rules, operating principles, **intake** (legacy inventory + naming questionnaire + project profile + slice map), seed decision register, lessons learned |
| `mfe-shell-setup` | create the shell, Okta, nav, fallbacks, generator, CI | complete code for workspace, shared libs, shell app, generator, guard scripts, pipeline, E2E gate |
| `mfe-add-remote` | add or replace a screen with a new remote | generator usage, kinds (domain / capability / hub), legacy **parity** procedure, deploy, removal |
| `mfe-onboard-legacy-app` | turn the legacy app into an isolated remote | spike checklist, mount contract, adapter code (router, auth, CSS, overlays), CI, gate |
| `mfe-aws-hosting` | need AWS requirements, deploy/rollback, CloudFront issues | resource list for the infra team, bucket layout, behaviours, CSP, deploy scripts, GitLab OIDC |

### How the agent behaves (built into the skills)
1. **The legacy app is the source of truth for behaviour.** Routes, fields, validations, role rules, APIs, Okta settings and wording are read from the legacy code, with file citations. The agent does not invent them.
2. **The skills are the source of truth for architecture.** If a legacy pattern breaks a platform rule, the agent keeps the behaviour, implements it the platform way, and records a decision.
3. **It asks before naming anything.** It proposes defaults derived from the legacy app, asks you in small batches, and records your answers in `docs/migration/project-profile.md`. It does not ask the same thing twice.
4. **Gates before progress.** Each phase ends with an automated check (mostly E2E). The agent reports what it ran.
5. **Minimal change to the legacy app.** Only a thin adapter is added; business code stays untouched unless you approve.

---

## 2. Prerequisites

| Need | Why |
| --- | --- |
| The legacy app is Angular 17+ on the esbuild `application` builder | required for the isolated-remote recipe (if it is still on webpack, migrate the builder first) |
| Node 22, npm 11, Git, a recent AWS CLI v2 (for deploy jobs) | toolchain pins |
| Read access to the legacy repo; a new empty GitLab project for the shell | the agent reads one and writes the other |
| Contacts: Okta admin, cloud/infra team, backend team, design-system owner | the agent produces requirement lists for them |
| Usage data for the legacy app (top 10 screens) | spike and first-slice choice |
| Claude Code (CLI, desktop or IDE) | runs the agent with the skills |

---

## 3. One-time setup

### 3.1 Folder layout
```
workspace/
├─ <legacy-app>/          existing repo (read-only for the agent until Phase 2)
└─ <App-New-Name>/    new, empty shell repo (git init, GitLab remote)
```

### 3.2 Install the skills
Copy the five `mfe-*` folders (and this guide) into **both** repos:
```bash
mkdir -p <App-New-Name>/.claude/skills <legacy-app>/.claude/skills
cp -R mfe-platform-blueprint mfe-shell-setup mfe-add-remote mfe-onboard-legacy-app mfe-aws-hosting <App-New-Name>/.claude/skills/
cp -R mfe-platform-blueprint mfe-onboard-legacy-app mfe-aws-hosting <legacy-app>/.claude/skills/
```
(Or install them once in `~/.claude/skills/` for your user.) Commit them, so the whole team and CI agents use the same version.

### 3.3 Add a `CLAUDE.md` to the shell repo
```md
# <App-New-Name>: guidance for AI agents
This repo is the micro-frontend platform replacing <legacy-app>. Before any change, follow the `mfe-platform-blueprint` skill.
- The legacy app (../<legacy-app>) is the source of truth for behaviour; these skills are the source of truth for architecture.
- Read docs/migration/project-profile.md before asking for names or settings; record every new answer there.
- Never invent entitlement names, API paths, routes or labels: take them from the legacy code or ask.
- New apps only via `npx nx g <scope>/tools:mfe`. Federation shared config only in libs/mf-manifest/src/shared.config.js.
- Every phase ends with its gate (apps/shell-e2e/src/phase-N-*.spec.ts). Report what ran.
- Record architectural decisions in docs/platform-handbook.md (decision register).
```
And a short one in the legacy repo:
```md
# <legacy-app>: guidance for AI agents
This app is being onboarded as an isolated micro-frontend (skill `mfe-onboard-legacy-app`).
Only add the platform adapter (federation.config.js, src/mount*.ts, src/app/platform-adapter/, CSS scoping, CI include).
Do not change business code, routes, roles or APIs without explicit approval. Standalone mode (main.ts) must keep working.
```

### 3.4 Start the agent with both repos visible
```bash
cd <App-New-Name>
claude --add-dir ../<legacy-app>
```
Skills load automatically when your request matches them. You can also name one explicitly ("use the mfe-shell-setup skill") or invoke it as a slash command (`/mfe-platform-blueprint`).

---

## 4. Working rhythm (efficient use of the agent)

- **One step per session.** Start each step below in a fresh session (or `/clear`). The files in `docs/migration/` carry the context between sessions, so the agent doesn't need old chat history.
- **Short prompts that name the step and the output.** The skills hold the detail; don't paste architecture into prompts.
- **Answer questions in the dialog.** When the agent proposes a default you agree with, just accept it.
- **Use plan mode for big steps** (shell creation, legacy adapter): ask for the plan first, approve it, then let it run.
- **Commit per step** on a branch, then open an MR. Ask the agent for the commit when the gate passes.
- **Review the outputs listed under "You check".** That's where human judgement matters: names, slice map, parity notes, AWS requests.
- **Don't override the architecture in prompts** ("just put it in the shell", "skip the mocks"). If a rule blocks you, ask the agent to record a decision instead.

---

## 5. Step by step

### Step 0: Intake (legacy inventory, naming, profile, slice map)
**Goal:** facts from the legacy code plus confirmed names, before any code.

**Prompt**
```
Use the mfe-platform-blueprint skill and run the intake for migrating ../<legacy-app> to the
micro-frontend platform in this repo. Inventory the legacy app read-only (cite files), then ask me the
naming and settings questions, and write docs/migration/legacy-inventory.md, project-profile.md and a
proposed slice-map.md. Don't write any platform code yet.
```
**The agent will ask** (it proposes defaults):
- product name, npm scope, remote naming pattern, legacy remote name and route segment
- selector prefixes, entitlement and event naming
- environments and domains, design-system package and version
- Okta tenant and client (whether to reuse the legacy client), entitlement source, API origin
- AWS accounts and resource naming, GitLab group and tag format, team handles, the first slice

**Produces:** `docs/migration/legacy-inventory.md`, `project-profile.md`, `slice-map.md` (proposed).

**You check:**
- the route tree and the role rules match what you know of the app
- the open questions are answered
- the names are what your organisation wants
- you approve the slice map: one feature module ≈ one domain remote, shared widgets ≈ capabilities, and a first slice with few dependencies

### Step 1: Plan, decision register and roadmap
**Prompt**
```
Using the blueprint and our project profile, create docs/platform-handbook.md from the seed decision
register (adapt wording to our names and answers) and docs/roadmap.md with the phases, each with its gate.
List anything in the legacy inventory that conflicts with the architecture rules and propose a decision for each.
```
**Produces:** handbook (ADR-0001…0020 adapted, plus project-specific ADRs), roadmap with gates.

**You check:** conflicts and the proposed resolutions; phase order; who owns what.

### Step 2: Requests to other teams (start early: they have lead time)
**Prompt**
```
Using mfe-aws-hosting and mfe-shell-setup (okta.md), write docs/migration/requests/aws-infra.md and
docs/migration/requests/okta.md filled with our profile values. Mark every value still unknown and ask me for it.
Also list what the backend team must provide (/api behind CloudFront, entitlements endpoint, 401/403).
```
**Produces:** ready-to-send requirement documents for infra, Okta admin and backend.

**You check:** account ids, domains, CIDRs, retention periods. Send them now; provisioning takes days.

### Step 3: Create the shell workspace (Phase 0, part 1)
**Prompt** (plan mode recommended)
```
Use mfe-shell-setup to create the shell workspace in this repo with the names from our project profile:
workspace config and pins, shared libs, shell app on mocks, the generator, guard scripts.
Show me the plan first. Stop after `lint test build` and the guard scripts pass, and report the results.
```
**The agent may ask:** the design-system package and version if they're not in the profile; whether to include optional Angular packages (cdk, forms).

**Produces:** a running shell on mocks (`npm start` → http://localhost:4200, persona switcher, "Mock data" badge).

**You check:**
- `npx nx run-many -t lint test build` passes, and so do `check:shared-config`, `check:headers` and `check:no-mocks`
- no `<placeholder>` or `@platform` is left behind (unless that's your chosen scope): `grep -rn "<org>\|<group>\|<domain>" apps libs tools`

### Step 4: Okta in the shell
**Prompt**
```
Use mfe-shell-setup (okta.md) to wire real Okta in the shell with the issuer/client from our profile and
the legacy app's Okta settings from the inventory. Fill apps/shell/config/<env>/app-config.json for every
environment. Keep mock auth for development and mock builds. Tell me exactly what to configure in Okta.
```
**You check:** the redirect URIs, trusted origins and scopes match the Okta request from Step 2. The login works on localhost against the dev Okta tenant.

### Step 5: CI/CD and deploy dry run (Phase 0, part 2)
**Prompt**
```
Use mfe-shell-setup (ci-pipeline.md) and mfe-aws-hosting (deploy-scripts.md, gitlab-deploy.md) to add the
GitLab pipeline, OIDC templates, deploy/rollback/smoke scripts and the remote-deploy template for other repos.
Then generate a first test remote with the generator, and run the local deploy dry run (deploy, smoke, serve,
E2E against BASE_URL, rollback). List the CI/CD variables I must create in GitLab.
```
**Produces:** pipeline, `tools/ci/*`, `ci/templates/*`, a dry-run deploy in `dist/deploy/dev`, a list of GitLab variables.

**You check:** the dry-run E2E passed; the rollback changed only one manifest key; the variables are created and scoped by environment (prod ones protected).

### Step 6: Shell live on dev (Phase 1 gate)
Needs AWS dev and Okta from Step 2.

**Prompt**
```
AWS dev and Okta are ready (values in the profile). Deploy the shell and the test remote to dev through the
pipeline, run the verification curls from mfe-aws-hosting and the phase-1 E2E against dev, and update the
roadmap if the gate passes.
```
**You check:**
- real sign-in works, and a deep link survives sign-in
- stopping the remote breaks only its section, and Retry recovers it
- the curls show `no-cache` on root files, a 403 on `_deploy/` and the bucket private

### Step 7: Legacy spike (Phase 2 start)
Run in the legacy repo (`cd ../<legacy-app> && claude --add-dir ../<App-New-Name>`).

**Prompt**
```
Use mfe-onboard-legacy-app. On a spike branch, add the federation target, mount entry and platform adapter
(minimal, no business code changes) and mount the app in the shell locally. Run the spike checklist on the
10 screens listed in the legacy inventory and write docs/migration/spike-report.md in the platform repo
with pass/fail and the fix for each item.
```
**The agent may ask:** the Native Federation version matching your Angular version, which overlay libraries the app uses, whether the app can switch to the shell's Okta client.

**You check:** every spike item has a result; the risky items (federation compatibility, zone.js, CSS leaks, overlays, routing, Okta) have a clear decision. Approve the recorded ADR amendment.

### Step 8: Legacy onboarded (Phase 2 gate)
**Prompt** (legacy repo, then platform repo)
```
Finish the legacy onboarding per mfe-onboard-legacy-app and the spike report: CSS scoping, auth bridge,
router sync, overlays, assets, CI include of remote-deploy, legacy-bridge contract package, LegacyHostComponent
and route in the shell. Then write and run the phase-2 E2E gate (mocks locally, then dev).
```
**You check:**
- one sign-in only, and deep links work under `/<legacy>/…`
- back and forward work across the shell and the legacy app
- visual regression shows no style leaks
- legacy role behaviour is unchanged for each persona
- with the legacy remote down, only its section is affected
- production: deploy to staging/prod manually, then announce one URL to users

### Step 9: First new slice (Phase 3)
**Prompt** (platform repo)
```
Use mfe-add-remote to replace the legacy screen "<screen>" (slice 1 in slice-map.md). Follow the parity
procedure: document the legacy behaviour in docs/migration/slices/<remote>.md with citations, ask me only
about gaps or intended changes, then generate the remote, mock its APIs from the legacy contracts, build it with
the design system, write the parity E2E, and add the strangler redirect only when parity passes.
```
**The agent will ask:** any behaviour the legacy code doesn't define, and whether to change wording or layout (the default is "same as legacy").

**You check:** the parity document (this is the spec of the new screen); that the parity E2E passes against both the old and the new screen; the redirect keeps the path and query.

### Step 10: Repeat slices; extract capabilities
**Prompt (per slice)**
```
Next slice from slice-map.md: <name>. Same parity procedure (mfe-add-remote). Update the slice map status.
```
**Prompt (capability)**
```
The legacy widget "<widget>" is used by <screens>. Use mfe-add-remote to build it as a capability remote with a
named Inputs contract, matching legacy behaviour, and embed it where the slice map says.
```

### Step 11: Retire the legacy remote
**Prompt**
```
All slices are done per slice-map.md. Check access logs/analytics evidence I provide for remaining /<legacy>/
traffic, then plan the removal: manifest entry, shell route and host, redirects that can go, CloudFront/CSP
allowances, legacy-bridge package. Record the decision and update the roadmap.
```

---

## 6. Useful prompts during the work

| Situation | Prompt |
| --- | --- |
| A section shows "unavailable" | `A section says unavailable on <env>. Diagnose with the platform logs and platformDiagnostics() codes (mfe-platform-blueprint lessons, mfe-aws-hosting troubleshooting) and propose the fix.` |
| Add a mocked API | `Add a mock for <METHOD /api/path> following mfe-shell-setup libs.md (mocks), with payloads taken from the legacy service <file>.` |
| New entitlement | `Add entitlement for <feature>. Take the role name from the legacy inventory; wire persona, nav, guard, directive and mock 403.` |
| Upgrade Angular/NF/Nx | `Plan an upgrade of Angular, Native Federation and Nx together per the blueprint rules; list every app to rebuild and the checks to run.` |
| Design-system bump | `Bump the design system to <x.y.z>; all apps rebuild (FULL_BUILD). Run all checks and the E2E.` |
| Review an MR | `Review this branch against the mfe-* rules (shared config, mocks firewall, boundaries, contracts additive, no console, file headers, legacy parity).` |
| Agent invented a name | `Don't invent names. Take it from the legacy code or ask me, and record it in project-profile.md.` |
| Agent wants to change legacy code | `Keep legacy business code unchanged; solve it in the adapter or the shell, or explain why that's impossible.` |

---

## 7. Questions the agent asks you (and when)

| When | Questions |
| --- | --- |
| Step 0 | all naming and settings (see the `mfe-platform-blueprint/references/intake.md` questionnaire), the top 10 screens, the first slice, gaps in the legacy code |
| Step 2 | missing AWS and Okta values (account ids, CIDRs, retention, domains) |
| Step 3 | the design-system package and registry, optional packages |
| Step 7 | the NF version for legacy Angular, the overlay libraries, the Okta client choice |
| Steps 9–10 | behaviour gaps per screen, any intended changes from legacy behaviour |
| Any time | a name that's not in the profile, a conflict between a legacy pattern and an architecture rule |

If the agent asks something already in `project-profile.md`, point it there. If it **doesn't** ask and uses a name you never confirmed, stop it (see section 6).

---

## 8. Artefacts and where they live

| File (shell repo) | Written in | Purpose |
| --- | --- | --- |
| `docs/migration/legacy-inventory.md` | Step 0 | facts from the legacy code, with citations |
| `docs/migration/project-profile.md` | Step 0, updated always | confirmed names and settings |
| `docs/migration/slice-map.md` | Step 0, updated per slice | legacy module → target remote, order, status |
| `docs/platform-handbook.md` | Step 1 | decision register + lessons |
| `docs/roadmap.md` | Step 1 | phases, gates, status |
| `docs/migration/requests/*.md` | Step 2 | infra / Okta / backend requests |
| `docs/migration/spike-report.md` | Step 7 | legacy onboarding risks and fixes |
| `docs/migration/slices/<remote>.md` | Steps 9–10 | parity spec per replaced screen |
| `apps/shell-e2e/src/phase-*.spec.ts`, `parity-*.spec.ts` | each phase / slice | the gates |

---

## 9. Definition of done per phase

| Phase | Done when |
| --- | --- |
| 0 Foundations | lint, test, build and guard scripts green; local deploy dry run plus E2E green; a generated remote deployed by the pipeline to dev |
| 1 Shell live | real Okta on dev; deep link survives sign-in; per-section fallback and Retry; curls as expected |
| 2 Legacy onboarded | phase-2 E2E on dev; one sign-in; no style leaks; roles unchanged; legacy outage isolated |
| 3+ Slices | parity E2E green on old and new; redirect live; slice map updated |
| Retire | no legacy traffic for one release; legacy remote removed; decision recorded |

---

## 10. Common mistakes

- Starting with code before the intake: names drift and get renamed later across many repos.
- Letting the agent "improve" behaviour during a slice: parity first, then change it in a separate, approved MR.
- Putting new screens into the legacy app "because it's faster": that defeats the strangler.
- Sharing the legacy app's Angular with the shell: the legacy remote shares nothing until it's upgraded.
- Custom CloudFront error pages that map 404 to `index.html`: they hide missing chunks.
- Two different Okta clients on one domain: both write to the same token storage key.
- Skipping gates "to save time": the gates are what lets each team deploy alone safely.

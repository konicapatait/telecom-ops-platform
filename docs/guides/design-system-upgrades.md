# Design-system upgrades

ADR-0001 sets the policy and ADR-0011 covers the vendored tarballs.

**Today (vendored tarballs):**
```bash
cd ../design-system && npm run release:local     # after bumping projects/*/package.json + CHANGELOG
cd ../telecom-ops-platform && npm run ds:sync   # copies tgz → vendor/, updates package.json, installs
npm run build:all && npm run test:all && npm run e2e
```
Commit `vendor/`, `package.json` and `package-lock.json` together. CI sees the `@org/design-*` change and runs **every** app.

**After the registry exists:** Renovate opens one MR per release (`renovate.json`). Patch releases auto-merge on green. Minors need review. Majors are labelled `breaking` and wait for an upgrade window.

**Worked example in history:** 0.1.0 → 0.1.1 fixed `ds-nav-list` keeping "Home" active on every page (`routerLinkActiveOptions.exact` for `/`). It was found while verifying Phase 1 and shipped through exactly this flow.

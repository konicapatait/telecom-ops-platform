# Guard scripts: complete code

Put these in `tools/scripts/`, wire them as npm scripts (workspace.md) and run them in CI (`workspace:checks` job). Each prints `✔` on success and exits 1 with `✘` lines on failure.

## `check-shared-config.mjs` (ADR-0007)
```js
#!/usr/bin/env node
/**
 * @file Shared-config drift check. Every federated app's federation.config.js must call withPlatformFederation, must NOT
 * declare shared/share(/shareAll(/sharedMappings/skip, and must use its project name as federation name. Every shared npm
 * package must be pinned exactly; every sharedMapping must exist in tsconfig.base.json paths.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const SHARED = 'libs/mf-manifest/src/shared.config.js';
const errors = [];

const federatedApps = readdirSync('apps').filter((d) => {
  const pj = join('apps', d, 'project.json');
  return existsSync(pj) && (JSON.parse(readFileSync(pj, 'utf8')).tags ?? []).includes('type:app');
});

for (const app of federatedApps) {
  const file = join('apps', app, 'federation.config.js');
  if (!existsSync(file)) { errors.push(`${app}: missing federation.config.js`); continue; }
  const src = readFileSync(file, 'utf8');
  if (!src.includes('withPlatformFederation(')) errors.push(`${file}: must use withPlatformFederation()`);
  for (const banned of ['shared:', 'share(', 'shareAll(', 'sharedMappings', 'skip:', 'withNativeFederation(']) {
    if (src.includes(banned)) errors.push(`${file}: declares "${banned}". Shared config lives only in ${SHARED}.`);
  }
  const name = /name:\s*'([^']+)'/.exec(src)?.[1];
  if (name !== app) errors.push(`${file}: federation name "${name}" must equal the project name "${app}"`);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const { sharedMappings } = require(join(process.cwd(), SHARED));
const src = readFileSync(SHARED, 'utf8');
const block = src.slice(src.indexOf('share({'), src.indexOf('});', src.indexOf('share({')));
const sharedPackages = [...block.matchAll(/^\s*'?([@a-z0-9/._-]+)'?:\s*singleton/gm)].map((m) => m[1]);
for (const name of sharedPackages) {
  const v = deps[name];
  if (!v) errors.push(`shared package ${name} is not a dependency in package.json`);
  else if (/^[\^~><]/.test(v)) errors.push(`shared package ${name}@${v} must be pinned exactly (no ^ or ~)`);
}

const paths = JSON.parse(readFileSync('tsconfig.base.json', 'utf8')).compilerOptions.paths;
for (const m of sharedMappings) if (!paths[m]) errors.push(`sharedMapping ${m} has no tsconfig.base.json path`);

if (errors.length) { errors.forEach((e) => console.error('✘ ' + e)); process.exit(1); }
console.log(`✔ Shared config OK: ${federatedApps.length} apps, ${sharedPackages.length} shared packages, ${sharedMappings.length} shared libs.`);
```
(`tsconfig.base.json` must be plain JSON, without comments, for this parse.)

## `check-no-mocks-in-prod.mjs` (ADR-0005)
```js
#!/usr/bin/env node
/**
 * @file Fails if a PRODUCTION bundle contains mock code or fixtures.
 * Usage: node tools/scripts/check-no-mocks-in-prod.mjs [dist/apps/<app> ...]   (default: every dist/apps/*)
 * Mock builds live in dist/apps-mock/ and are not scanned.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  { pattern: 'mockServiceWorker', why: 'MSW worker registration' },
  { pattern: 'msw/browser', why: 'MSW import' },
  { pattern: '[MSW]', why: 'MSW runtime' },
  { pattern: 'mock.analyst', why: 'mock persona token' },
  { pattern: 'platform.mockPersona', why: 'MockAuthService' },
  // Add your distinctive fixture ids, e.g. { pattern: 'REC-2026-000142', why: 'hero fixture id' },
];

const roots = process.argv.slice(2).length
  ? process.argv.slice(2)
  : existsSync('dist/apps') ? readdirSync('dist/apps').map((d) => join('dist/apps', d)) : [];
if (!roots.length) { console.error('No production builds found. Run `nx run-many -t build` first.'); process.exit(1); }

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

let failures = 0;
for (const root of roots) {
  for (const file of walk(root).filter((f) => /\.(js|mjs|html|json)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    for (const { pattern, why } of FORBIDDEN) {
      if (text.includes(pattern)) { console.error(`✘ ${file}: contains "${pattern}" (${why})`); failures++; }
    }
  }
  if (existsSync(join(root, 'browser', 'mockServiceWorker.js'))) { console.error(`✘ ${root}: ships mockServiceWorker.js`); failures++; }
}
if (failures) { console.error(`\n${failures} mock leak(s) in production bundles (ADR-0005).`); process.exit(1); }
console.log(`✔ No mock code in ${roots.length} production build(s).`);
```

## `check-file-headers.mjs`
```js
#!/usr/bin/env node
/**
 * @file Fails when a source file under apps/, libs/ or tools/ does not start with a header comment saying what it is for.
 * A header is any leading comment (/** @file … *\/, /* … *\/, // …) or a shebang. Specs and generator templates are skipped.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps', 'libs', 'tools'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'files', 'assets', '.angular']);
const SKIP_FILES = [/\.spec\.ts$/, /mockServiceWorker\.js$/, /tsconfig\.federation\.json$/];

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  if (statSync(p).isDirectory()) return SKIP_DIRS.has(f) ? [] : walk(p);
  return [p];
});

const missing = ROOTS.flatMap(walk)
  .filter((f) => /\.(ts|mts|js|mjs)$/.test(f) && !SKIP_FILES.some((re) => re.test(f)))
  .filter((f) => !/^(\/\*|\/\/|#!)/.test(readFileSync(f, 'utf8').trimStart()));

if (missing.length) { missing.forEach((f) => console.error(`✘ ${f}: add a header comment (/** @file <what this file is for> */)`)); process.exit(1); }
console.log('✔ Every source file starts with a header comment.');
```

## Optional: layout-fork check
If you add family layout libs, write a small script that greps each family member for things only the layout may own (its own tab bar, its own `loadCapability` calls, copies of the layout's components) and fails CI. Layout differences go into configuration, never forks.

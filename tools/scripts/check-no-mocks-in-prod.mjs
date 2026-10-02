#!/usr/bin/env node
/**
 * Fails if a PRODUCTION bundle contains mock code or fixtures (ADR-0006).
 * Usage: node tools/scripts/check-no-mocks-in-prod.mjs [dist/apps/<app> ...]   (default: every dist/apps/*)
 * Mock builds live in dist/apps-mock/ and are deliberately not scanned.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FORBIDDEN = [
  { pattern: 'mockServiceWorker', why: 'MSW worker registration' },
  { pattern: 'msw/browser', why: 'MSW import' },
  { pattern: '[MSW]', why: 'MSW runtime' },
  { pattern: 'FRD-2026-000142', why: 'hero fixture id' },
  { pattern: 'BIL-2026-003318', why: 'hero fixture id' },
  { pattern: 'PTR-2026-000057', why: 'hero fixture id' },
  { pattern: 'mock.analyst', why: 'mock persona token' },
  { pattern: 'platform.mockPersona', why: 'MockAuthService' },
];

const roots = process.argv.slice(2).length
  ? process.argv.slice(2)
  : existsSync('dist/apps')
    ? readdirSync('dist/apps').map((d) => join('dist/apps', d))
    : [];

if (!roots.length) {
  console.error('No production builds found. Run `nx run-many -t build` first.');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

let failures = 0;
for (const root of roots) {
  for (const file of walk(root).filter((f) => /\.(js|mjs|html|json)$/.test(f))) {
    const text = readFileSync(file, 'utf8');
    for (const { pattern, why } of FORBIDDEN) {
      if (text.includes(pattern)) {
        console.error(`✘ ${file}: contains "${pattern}" (${why})`);
        failures++;
      }
    }
  }
  if (existsSync(join(root, 'browser', 'mockServiceWorker.js'))) {
    console.error(`✘ ${root}: ships mockServiceWorker.js`);
    failures++;
  }
}

if (failures) {
  console.error(`\n${failures} mock leak(s) in production bundles. See docs/adr/0006-mock-first-with-msw.md.`);
  process.exit(1);
}
console.log(`✔ No mock code in ${roots.length} production build(s).`);

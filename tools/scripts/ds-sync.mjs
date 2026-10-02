#!/usr/bin/env node
/**
 * LOCAL ONLY: vendor freshly packed design-system tarballs from the sibling repo (ADR-0011).
 *   node tools/scripts/ds-sync.mjs [path-to-design-system-repo]   (default ../design-system)
 * Copies dist/packages/*.tgz into vendor/, points package.json at them and runs npm install.
 * Once @org/* is on the internal registry, Renovate replaces this flow.
 */
import { copyFileSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const repo = process.argv[2] ?? '../design-system';
const src = join(repo, 'dist/packages');
const tarballs = readdirSync(src).filter((f) => /^org-design-(system|tokens)-\d+\.\d+\.\d+\.tgz$/.test(f));
if (!tarballs.length) throw new Error(`No tarballs in ${src}. Run \`npm run release:local\` in ${repo}.`);

for (const old of readdirSync('vendor').filter((f) => f.endsWith('.tgz'))) rmSync(join('vendor', old));
for (const t of tarballs) copyFileSync(join(src, t), join('vendor', t));

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const t of tarballs) {
  const name = t.startsWith('org-design-system') ? '@org/design-system' : '@org/design-tokens';
  pkg.dependencies[name] = `file:vendor/${t}`;
  console.log(`${name} -> vendor/${t}`);
}
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
execSync('npm install', { stdio: 'inherit' });
console.log('Design system synced. A design-system bump affects ALL apps: run `npm run build:all` (ADR-0001).');

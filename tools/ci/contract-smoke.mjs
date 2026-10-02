#!/usr/bin/env node
/**
 * Post-deploy contract smoke (plan: CI/CD). For the app's LIVE manifest entry in <env>, checks that:
 *   - remoteEntry.json is reachable and its name matches the app
 *   - it exposes exactly what apps/<app>/federation.config.js declares
 *   - every shared singleton was built against the version pinned in package.json (strictVersion would fail at runtime)
 *   node tools/ci/contract-smoke.mjs --app mfe-fraud --env dev [--provider local|s3]
 */
import { readFileSync } from 'node:fs';
import { parseArgs, required } from './lib/args.mjs';
import { storageFor } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env');
const { app, env } = args;
const storage = storageFor(args.provider);

if (app === 'shell') {
  if (!storage.exists(`${env}/index.html`) || !storage.exists(`${env}/mf-manifest.json`))
    throw new Error('shell not deployed');
  console.log(`✔ shell is live in ${env}`);
  process.exit(0);
}

const manifest = storage.readJson(`${env}/mf-manifest.json`, {});
const url = manifest[app];
if (!url) throw new Error(`${app} is not in the ${env} manifest`);

const entry = /^https?:/.test(url)
  ? await fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
      return r.json();
    })
  : storage.readJson(`${env}/${url.replace(/^\/+/, '')}`, null);
if (!entry) throw new Error(`Cannot read ${url}`);

const errors = [];
if (entry.name !== app) errors.push(`remoteEntry name "${entry.name}" != "${app}"`);

const declared = [...readFileSync(`apps/${app}/federation.config.js`, 'utf8').matchAll(/'(\.\/[A-Za-z]+)':/g)]
  .map((m) => m[1])
  .sort();
const exposed = entry.exposes.map((e) => e.key).sort();
if (JSON.stringify(declared) !== JSON.stringify(exposed)) errors.push(`exposes ${exposed} != declared ${declared}`);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const pinned = { ...pkg.dependencies, ...pkg.devDependencies };
for (const s of entry.shared.filter((s) => s.singleton && pinned[s.packageName])) {
  const want = pinned[s.packageName].replace(/^file:.*-(\d+\.\d+\.\d+)\.tgz$/, '$1');
  if (s.version && s.version !== want) errors.push(`${s.packageName} built with ${s.version}, platform pins ${want}`);
}

if (errors.length) {
  errors.forEach((e) => console.error('✘ ' + e));
  process.exit(1);
}
console.log(`✔ ${app} in ${env}: exposes ${exposed.join(', ')}; ${entry.shared.length} shared deps match pins`);

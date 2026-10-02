#!/usr/bin/env node
/**
 * Shared-config drift check (ADR-0008). Every app's federation.config.js must:
 *   - call withPlatformFederation from libs/mf-manifest/src/shared.config.js
 *   - NOT declare its own `shared`, `share(`, `shareAll(`, `sharedMappings` or `skip`
 *   - use its project name as the federation name
 * Every shared npm package must be pinned to an EXACT version in the root package.json (no ^ or ~),
 * and every sharedMapping must exist in tsconfig.base.json paths.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const errors = [];

/** Federated apps = projects under apps/ tagged type:app (e2e and tooling projects are skipped). */
const federatedApps = readdirSync('apps').filter((d) => {
  const pj = join('apps', d, 'project.json');
  return existsSync(pj) && (JSON.parse(readFileSync(pj, 'utf8')).tags ?? []).includes('type:app');
});

for (const app of federatedApps) {
  const file = join('apps', app, 'federation.config.js');
  if (!existsSync(file)) {
    errors.push(`${app}: missing federation.config.js`);
    continue;
  }
  const src = readFileSync(file, 'utf8');
  if (!src.includes('withPlatformFederation(')) errors.push(`${file}: must use withPlatformFederation()`);
  for (const banned of ['shared:', 'share(', 'shareAll(', 'sharedMappings', 'skip:', 'withNativeFederation(']) {
    if (src.includes(banned))
      errors.push(`${file}: declares "${banned}". Shared config lives only in libs/mf-manifest.`);
  }
  const name = /name:\s*'([^']+)'/.exec(src)?.[1];
  if (name !== app) errors.push(`${file}: federation name "${name}" must equal the project name "${app}"`);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const { sharedMappings } = require(join(process.cwd(), 'libs/mf-manifest/src/shared.config.js'));
const sharedSrc = readFileSync('libs/mf-manifest/src/shared.config.js', 'utf8');
const sharedBlock = sharedSrc.slice(
  sharedSrc.indexOf('share({'),
  sharedSrc.indexOf('});', sharedSrc.indexOf('share({')),
);
const sharedPackages = [...sharedBlock.matchAll(/^\s*'?([@a-z0-9/._-]+)'?:\s*singleton/gm)].map((m) => m[1]);
for (const name of sharedPackages) {
  const v = deps[name];
  if (!v) errors.push(`shared package ${name} is not a dependency in package.json`);
  else if (/^[\^~><]/.test(v)) errors.push(`shared package ${name}@${v} must be pinned exactly (no ^ or ~)`);
}

const paths = JSON.parse(readFileSync('tsconfig.base.json', 'utf8')).compilerOptions.paths;
for (const m of sharedMappings) if (!paths[m]) errors.push(`sharedMapping ${m} has no tsconfig.base.json path`);

if (errors.length) {
  errors.forEach((e) => console.error('✘ ' + e));
  process.exit(1);
}
console.log(
  `✔ Shared config OK: ${federatedApps.length} apps, ${sharedPackages.length} shared packages, ${sharedMappings.length} shared libs.`,
);

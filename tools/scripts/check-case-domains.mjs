#!/usr/bin/env node
/**
 * Family layouts, no forks (ADR-0021, ADR-0024). Case family: every case-family domain uses libs/case-workspace.
 * 360 family: see the second block below.
 * For each project tagged family:case + kind:domain:
 *   - its exposed ./Routes file uses CaseWorkspaceLayoutComponent, CaseQueueComponent and CaseViewComponent
 *   - no source file builds its own case screen: no ds-tabs/DsTabs, no loadCapability/ViewContainerRef tab hosts,
 *     no component whose selector looks like a case view, queue, header or tab host
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const REQUIRED = ['CaseWorkspaceLayoutComponent', 'CaseQueueComponent', 'CaseViewComponent'];
const FORBIDDEN = [
  { re: /\bDsTabs?\b|<ds-tabs/, why: 'own tab bar (use CaseDomainConfig.tabs)' },
  { re: /\bloadCapability\b|\bpreloadRemoteModule\b/, why: 'own capability loading (the case tab host does this)' },
  { re: /selector:\s*'[^']*(case-view|case-queue|case-header|tab-host)[^']*'/, why: 'forked case layout component' },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
const errors = [];
const domains = readdirSync('apps').filter((a) => {
  const pj = join('apps', a, 'project.json');
  const tags = existsSync(pj) ? (JSON.parse(readFileSync(pj, 'utf8')).tags ?? []) : [];
  return tags.includes('family:case') && tags.includes('kind:domain');
});

for (const app of domains) {
  const fed = readFileSync(join('apps', app, 'federation.config.js'), 'utf8');
  const routesFile = /'\.\/Routes':\s*'\.\/(apps\/[^']+)'/.exec(fed)?.[1];
  if (!routesFile || !existsSync(routesFile)) {
    errors.push(`${app}: cannot find the exposed ./Routes file`);
    continue;
  }
  const routes = readFileSync(routesFile, 'utf8');
  for (const r of REQUIRED)
    if (!routes.includes(r)) errors.push(`${routesFile}: must use ${r} from @platform/case-workspace`);
  for (const file of walk(join('apps', app, 'src')).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))) {
    const src = readFileSync(file, 'utf8');
    for (const { re, why } of FORBIDDEN) if (re.test(src)) errors.push(`${file}: ${why}`);
  }
}

/*
 * 360 family (ADR-0024): every family:360 domain renders its profile with Layout360Component from libs/layout-360,
 * builds no tab bar / capability loader of its own, and never shows the audit log (resolved decision).
 */
const views = readdirSync('apps').filter((a) => {
  const pj = join('apps', a, 'project.json');
  const tags = existsSync(pj) ? (JSON.parse(readFileSync(pj, 'utf8')).tags ?? []) : [];
  return tags.includes('family:360') && tags.includes('kind:domain');
});
for (const app of views) {
  const files = walk(join('apps', app, 'src')).filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
  const all = files.map((f) => readFileSync(f, 'utf8')).join('\n');
  if (!/<l360-layout\b/.test(all) || !all.includes('Layout360Component'))
    errors.push(`${app}: must render its profile with Layout360Component`);
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    if (/\bDsTabs?\b|<ds-tabs/.test(src)) errors.push(`${file}: 360 screens have no tab bar (use Section360 config)`);
    if (/\bloadCapability\b|\bpreloadRemoteModule\b/.test(src))
      errors.push(`${file}: own capability loading (use Section360.remote)`);
    if (src.includes('mfe-cap-audit-trail')) errors.push(`${file}: no audit log on 360 screens (resolved decision)`);
  }
}

if (errors.length) {
  errors.forEach((e) => console.error('✘ ' + e));
  process.exit(1);
}
console.log(`✔ ${domains.length} case domains use libs/case-workspace with no layout forks: ${domains.join(', ')}`);
console.log(
  `✔ ${views.length} full-profile (360) views use libs/layout-360 with no forks and no audit log: ${views.join(', ')}`,
);

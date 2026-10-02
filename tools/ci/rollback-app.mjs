#!/usr/bin/env node
/**
 * Rollback = a manifest change, no rebuild (plan: CI/CD). Points <app> back at an earlier immutable build.
 *   node tools/ci/rollback-app.mjs --app mfe-fraud --env prod [--to <version>] [--provider local|s3]
 * Without --to, goes back one release. The shell is rolled back by re-copying its versioned build to the root.
 */
import { ENVS, parseArgs, required } from './lib/args.mjs';
import { storageFor } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env');
const { app, env } = args;
if (!ENVS.includes(env)) throw new Error(`--env must be one of ${ENVS.join(', ')}`);

const storage = storageFor(args.provider);
const releases = storage.readJson(`${env}/releases.json`, {});
const history = releases[app] ?? [];
if (history.length < 2 && !args.to) throw new Error(`${app} has no earlier release in ${env}`);

const current = history.at(-1);
const target = args.to ? history.find((r) => r.version === args.to) : history.at(-2);
if (!target) throw new Error(`Version ${args.to} of ${app} was never deployed to ${env}`);

if (app === 'shell') {
  storage.copyDir(`${env}/shell/${target.version}`, env);
} else {
  const manifest = storage.readJson(`${env}/mf-manifest.json`, {});
  manifest[app] = target.url;
  storage.writeJson(`${env}/mf-manifest.json`, manifest);
}

history.push({
  ...target,
  at: new Date().toISOString(),
  by: process.env.GITLAB_USER_LOGIN ?? process.env.USER,
  rollbackFrom: current.version,
});
storage.writeJson(`${env}/releases.json`, releases);
console.log(`✔ Rolled back ${app} in ${env}: ${current.version} -> ${target.version}`);

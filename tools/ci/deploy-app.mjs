#!/usr/bin/env node
/**
 * Deploys ONE app to ONE environment and publishes it by updating ONE manifest entry (ADR-0007, ADR-0009).
 *   node tools/ci/deploy-app.mjs --app mfe-fraud --env dev --version abc1234 [--provider local|s3]
 *
 * dev uses the `mock` build (dist/apps-mock/<app>); staging/prod use the `production` build (dist/apps/<app>).
 * Remote:  upload to <env>/<app>/<version>/ (immutable) -> set manifest[<app>] -> append releases.json
 * Shell:   upload to <env>/shell/<version>/ -> copy to <env>/ root -> upload app-config.json -> seed manifest if absent
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENVS, parseArgs, required } from './lib/args.mjs';
import { publicBase, storageFor } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env', 'version');
const { app, env, version } = args;
if (!ENVS.includes(env)) throw new Error(`--env must be one of ${ENVS.join(', ')}`);

const storage = storageFor(args.provider);
const distRoot = env === 'dev' ? 'dist/apps-mock' : 'dist/apps';
const buildDir = join(distRoot, app, 'browser');
if (!existsSync(join(buildDir, 'remoteEntry.json'))) {
  throw new Error(`No build at ${buildDir}. Run: nx build ${app} -c ${env === 'dev' ? 'mock' : 'production'}`);
}

const now = new Date().toISOString();
const by = process.env.GITLAB_USER_LOGIN ?? process.env.USER ?? 'unknown';
const releases = storage.readJson(`${env}/releases.json`, {});

if (app === 'shell') {
  storage.putDir(buildDir, `${env}/shell/${version}`);
  storage.copyDir(`${env}/shell/${version}`, env);
  storage.writeJson(
    `${env}/app-config.json`,
    JSON.parse(readFileSync(`apps/shell/config/${env}/app-config.json`, 'utf8')),
  );
  if (!storage.exists(`${env}/mf-manifest.json`)) {
    storage.writeJson(
      `${env}/mf-manifest.json`,
      JSON.parse(readFileSync(`libs/mf-manifest/manifests/${env}/mf-manifest.json`, 'utf8')),
    );
  }
  (releases.shell ??= []).push({ version, at: now, by });
} else {
  const key = `${env}/${app}/${version}`;
  storage.putDir(buildDir, key);
  const url = `${publicBase(env)}/${key.slice(env.length + 1)}/remoteEntry.json`;
  const manifest = storage.readJson(`${env}/mf-manifest.json`, {});
  const previous = manifest[app];
  manifest[app] = url;
  storage.writeJson(`${env}/mf-manifest.json`, Object.fromEntries(Object.entries(manifest).sort()));
  (releases[app] ??= []).push({ version, url, previous: previous ?? null, at: now, by });
  console.log(`manifest[${app}]: ${previous ?? '(new)'} -> ${url}`);
}

storage.writeJson(`${env}/releases.json`, releases);
console.log(`✔ Deployed ${app}@${version} to ${env}`);

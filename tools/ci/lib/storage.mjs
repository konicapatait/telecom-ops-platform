/**
 * Deployment storage behind one interface (ADR-0009).
 *   local: dist/deploy/<env>/...   dry run you can serve with `node tools/ci/serve-env.mjs dev`
 *   s3:    s3://$DEPLOY_BUCKET/<env>/... via the AWS CLI (CDN in front; set PUBLIC_BASE_URL_<ENV>)
 *
 * Layout per environment:
 *   <env>/index.html, main-*.js ...    the live shell (mutable, served no-cache for index.html)
 *   <env>/<app>/<version>/...          every remote build, IMMUTABLE (cache forever)
 *   <env>/shell/<version>/...          immutable copy of each shell build (for rollback)
 *   <env>/mf-manifest.json             live remote manifest (no-cache), rollback = rewrite one entry
 *   <env>/app-config.json              runtime config for the shell (no-cache)
 *   <env>/releases.json                deploy history per app (what rollback reads)
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

class LocalStorage {
  constructor(root = 'dist/deploy') {
    this.root = root;
  }
  path(key) {
    return join(this.root, key);
  }
  putDir(localDir, key) {
    mkdirSync(this.path(key), { recursive: true });
    cpSync(localDir, this.path(key), { recursive: true });
  }
  copyDir(fromKey, toKey, { exclude = [] } = {}) {
    cpSync(this.path(fromKey), this.path(toKey), {
      recursive: true,
      filter: (src) => !exclude.some((e) => src.endsWith(e)),
    });
  }
  exists(key) {
    return existsSync(this.path(key));
  }
  readJson(key, fallback) {
    return this.exists(key) ? JSON.parse(readFileSync(this.path(key), 'utf8')) : fallback;
  }
  writeJson(key, value) {
    mkdirSync(dirname(this.path(key)), { recursive: true });
    writeFileSync(this.path(key), JSON.stringify(value, null, 2) + '\n');
  }
  removeDir(key) {
    rmSync(this.path(key), { recursive: true, force: true });
  }
}

class S3Storage {
  constructor(bucket = process.env.DEPLOY_BUCKET) {
    if (!bucket) throw new Error('DEPLOY_BUCKET is not set');
    this.bucket = bucket;
  }
  uri(key) {
    return `s3://${this.bucket}/${key}`;
  }
  aws(args, opts = {}) {
    return execFileSync('aws', args, { encoding: 'utf8', stdio: opts.capture ? 'pipe' : 'inherit', input: opts.input });
  }
  putDir(localDir, key) {
    this.aws(['s3', 'sync', localDir, this.uri(key), '--cache-control', IMMUTABLE, '--exclude', 'index.html']);
    if (existsSync(join(localDir, 'index.html'))) {
      this.aws(['s3', 'cp', join(localDir, 'index.html'), this.uri(`${key}/index.html`), '--cache-control', NO_CACHE]);
    }
  }
  copyDir(fromKey, toKey, { exclude = [] } = {}) {
    this.aws(['s3', 'sync', this.uri(fromKey), this.uri(toKey), ...exclude.flatMap((e) => ['--exclude', `*${e}`])]);
  }
  exists(key) {
    try {
      this.aws(['s3', 'ls', this.uri(key)], { capture: true });
      return true;
    } catch {
      return false;
    }
  }
  readJson(key, fallback) {
    try {
      return JSON.parse(this.aws(['s3', 'cp', this.uri(key), '-'], { capture: true }));
    } catch {
      return fallback;
    }
  }
  writeJson(key, value) {
    this.aws(['s3', 'cp', '-', this.uri(key), '--cache-control', NO_CACHE, '--content-type', 'application/json'], {
      input: JSON.stringify(value, null, 2),
    });
  }
}

export function storageFor(provider = process.env.DEPLOY_PROVIDER ?? 'local') {
  if (provider === 'local') return new LocalStorage(process.env.LOCAL_DEPLOY_ROOT);
  if (provider === 's3') return new S3Storage();
  throw new Error(`Unknown provider "${provider}" (local | s3)`);
}

/** Public URL prefix of an environment, e.g. https://cdn.dev.example.com. Empty = same origin as the shell. */
export function publicBase(env) {
  return (process.env[`PUBLIC_BASE_URL_${env.toUpperCase()}`] ?? process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
}

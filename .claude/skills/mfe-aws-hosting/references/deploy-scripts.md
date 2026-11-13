# Deploy, rollback and smoke scripts: complete code

Put these in `tools/ci/` of the shell repo (`lib/args.mjs` is in `../mfe-shell-setup/references/ci-pipeline.md`). Node 22, no npm dependencies. The `s3` provider calls AWS CLI v2 (a recent version: `s3api put-object --if-match` / `--if-none-match` are needed for conditional writes). The `local` provider writes the same layout to `dist/deploy/<env>/` for a dry run you can serve and E2E-test.

Key layout (identical for both providers; one bucket per environment, see SKILL.md):
`index.html` + live shell files at the root · `shell/<ver>/` · `mfe/<app>/<ver>/` · `mf-manifest.json` · `app-config.json` · `_deploy/releases/<app>.json`.

Environment variables: `DEPLOY_PROVIDER` (`local`|`s3`), `DEPLOY_BUCKET` (s3), `PUBLIC_BASE_URL` (e.g. `https://app.dev.<domain>`; empty = root-relative URLs, fine for same-origin and for local dry runs), `LOCAL_DEPLOY_ROOT` (default `dist/deploy`). In GitLab these are environment-scoped variables.

## `tools/ci/lib/storage.mjs`
```js
/**
 * @file Deployment storage behind one interface (ADR-0008, ADR-0019, ADR-0020).
 *   local: <LOCAL_DEPLOY_ROOT>/<env>/...   dry run; serve with `node tools/ci/serve-env.mjs <env>`
 *   s3:    s3://$DEPLOY_BUCKET/...         one bucket per environment, AWS CLI v2
 * JSON writes support conditions (ifMatch etag / ifNoneMatch) so concurrent pipelines never lose a manifest update.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const NO_CACHE = 'no-cache';

const hash = (text) => `"${createHash('md5').update(text).digest('hex')}"`;
const withTemp = (fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'deploy-'));
  try { return fn(join(dir, 'obj.json')); } finally { rmSync(dir, { recursive: true, force: true }); }
};

class LocalStorage {
  constructor(env, root = process.env.LOCAL_DEPLOY_ROOT ?? 'dist/deploy') {
    this.root = join(root, env);
  }
  path(key) { return join(this.root, key); }
  putDir(localDir, key) {
    mkdirSync(this.path(key), { recursive: true });
    cpSync(localDir, this.path(key), { recursive: true });
  }
  copyDir(fromKey, toKey) { cpSync(this.path(fromKey), this.path(toKey), { recursive: true }); }
  exists(key) { return existsSync(this.path(key)); }
  /** @returns {{ value: any, etag: string | null }} */
  readJson(key) {
    if (!this.exists(key)) return { value: undefined, etag: null };
    const text = readFileSync(this.path(key), 'utf8');
    return { value: JSON.parse(text), etag: hash(text) };
  }
  /** @returns {boolean} false when the condition failed */
  writeJson(key, value, { ifMatch, ifNoneMatch } = {}) {
    const { etag } = this.readJson(key);
    if ((ifNoneMatch && etag) || (ifMatch && etag !== ifMatch)) return false;
    mkdirSync(dirname(this.path(key)), { recursive: true });
    writeFileSync(this.path(key), JSON.stringify(value, null, 2) + '\n');
    return true;
  }
}

class S3Storage {
  constructor(bucket = process.env.DEPLOY_BUCKET) {
    if (!bucket) throw new Error('DEPLOY_BUCKET is not set');
    this.bucket = bucket;
  }
  uri(key) { return `s3://${this.bucket}/${key}`; }
  aws(args, capture = false) {
    return execFileSync('aws', args, { encoding: 'utf8', stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
  }
  putDir(localDir, key) {
    this.aws(['s3', 'sync', localDir, this.uri(key), '--cache-control', IMMUTABLE, '--exclude', 'index.html', '--no-progress']);
    if (existsSync(join(localDir, 'index.html'))) {
      this.aws(['s3', 'cp', join(localDir, 'index.html'), this.uri(`${key}/index.html`), '--cache-control', NO_CACHE, '--content-type', 'text/html']);
    }
  }
  /** S3→S3 sync copies object metadata (Cache-Control, Content-Type) too. */
  copyDir(fromKey, toKey) { this.aws(['s3', 'sync', this.uri(fromKey), this.uri(toKey), '--no-progress']); }
  exists(key) {
    try { this.aws(['s3api', 'head-object', '--bucket', this.bucket, '--key', key], true); return true; } catch { return false; }
  }
  readJson(key) {
    return withTemp((out) => {
      try {
        const meta = JSON.parse(this.aws(['s3api', 'get-object', '--bucket', this.bucket, '--key', key, out], true));
        return { value: JSON.parse(readFileSync(out, 'utf8')), etag: meta.ETag };
      } catch (e) {
        if (/NoSuchKey|Not Found|\(404\)/.test(String(e.stderr ?? e))) return { value: undefined, etag: null };
        throw e;
      }
    });
  }
  writeJson(key, value, { ifMatch, ifNoneMatch } = {}) {
    return withTemp((file) => {
      writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
      const cond = ifMatch ? ['--if-match', ifMatch] : ifNoneMatch ? ['--if-none-match', '*'] : [];
      try {
        this.aws(['s3api', 'put-object', '--bucket', this.bucket, '--key', key, '--body', file,
          '--cache-control', NO_CACHE, '--content-type', 'application/json', ...cond], true);
        return true;
      } catch (e) {
        if (/PreconditionFailed|ConditionalRequestConflict|\(412\)|\(409\)/.test(String(e.stderr ?? e))) return false;
        throw e;
      }
    });
  }
}

export function storageFor(env, provider = process.env.DEPLOY_PROVIDER ?? 'local') {
  if (provider === 'local') return new LocalStorage(env);
  if (provider === 's3') return new S3Storage();
  throw new Error(`Unknown provider "${provider}" (local | s3)`);
}

/** Read-modify-write with optimistic concurrency: retries when another pipeline wrote in between. */
export async function updateJson(storage, key, fallback, mutate, attempts = 5) {
  for (let i = 1; i <= attempts; i++) {
    const { value, etag } = storage.readJson(key);
    const next = mutate(structuredClone(value ?? fallback));
    if (storage.writeJson(key, next, etag ? { ifMatch: etag } : { ifNoneMatch: true })) return next;
    console.log(`${key} changed concurrently, retry ${i}/${attempts}`);
    await new Promise((r) => setTimeout(r, 500 * i));
  }
  throw new Error(`${key} kept changing concurrently; re-run the job`);
}

/** Public URL prefix of the environment, e.g. https://app.dev.example.com. Empty = root-relative (same origin). */
export const publicBase = () => (process.env.PUBLIC_BASE_URL ?? '').replace(/\/$/, '');
```

## `tools/ci/deploy-app.mjs`
```js
#!/usr/bin/env node
/**
 * @file Deploys ONE app to ONE environment and publishes it by updating ONE manifest entry (ADR-0006, ADR-0008).
 *   node tools/ci/deploy-app.mjs --app <app> --env dev|staging|prod --version <sha> [--provider local|s3] [--dir <build>]
 * dev gets the mock build (dist/apps-mock/<app>); staging and prod get the SAME production build (dist/apps/<app>).
 * Remote: upload mfe/<app>/<version>/ (immutable) → manifest[app] = its remoteEntry URL → _deploy/releases/<app>.json
 * Shell:  upload shell/<version>/ → copy to root → app-config.json → seed manifest only if absent → release history
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENVS, parseArgs, required } from './lib/args.mjs';
import { publicBase, storageFor, updateJson } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env', 'version');
const { app, env, version } = args;
if (!ENVS.includes(env)) throw new Error(`--env must be one of ${ENVS.join(', ')}`);

const storage = storageFor(env, args.provider);
const buildDir = args.dir ?? join(env === 'dev' ? 'dist/apps-mock' : 'dist/apps', app, 'browser');
if (!existsSync(join(buildDir, 'remoteEntry.json'))) {
  throw new Error(`No federation build at ${buildDir}. Run: nx build ${app} -c ${env === 'dev' ? 'mock' : 'production'}`);
}

const entry = { version, at: new Date().toISOString(), by: process.env.GITLAB_USER_LOGIN ?? process.env.USER ?? 'unknown', pipeline: process.env.CI_PIPELINE_URL };

if (app === 'shell') {
  storage.putDir(buildDir, `shell/${version}`);
  storage.copyDir(`shell/${version}`, '');
  const config = args.config ?? `apps/shell/config/${env}/app-config.json`;
  storage.writeJson('app-config.json', JSON.parse(readFileSync(config, 'utf8')));
  const seeded = storage.writeJson('mf-manifest.json', JSON.parse(readFileSync(`libs/mf-manifest/manifests/${env}/mf-manifest.json`, 'utf8')), { ifNoneMatch: true });
  if (seeded) console.log('mf-manifest.json seeded');
  await updateJson(storage, '_deploy/releases/shell.json', [], (r) => [...r, entry]);
} else {
  const key = `mfe/${app}/${version}`;
  storage.putDir(buildDir, key);
  const url = `${publicBase()}/${key}/remoteEntry.json`;
  let previous = null;
  await updateJson(storage, 'mf-manifest.json', {}, (m) => {
    previous = m[app] ?? null;
    m[app] = url;
    return Object.fromEntries(Object.entries(m).sort(([a], [b]) => a.localeCompare(b)));
  });
  await updateJson(storage, `_deploy/releases/${app}.json`, [], (r) => [...r, { ...entry, url, previous }]);
  console.log(`manifest[${app}]: ${previous ?? '(new)'} -> ${url}`);
}
console.log(`✔ Deployed ${app}@${version} to ${env}`);
```

## `tools/ci/rollback-app.mjs`
```js
#!/usr/bin/env node
/**
 * @file Rollback = a manifest change, no rebuild (ADR-0008). Points <app> back at an earlier immutable build.
 *   node tools/ci/rollback-app.mjs --app <app> --env prod [--to <version>] [--provider local|s3]
 * Without --to, goes back one release. The shell is rolled back by re-copying its versioned build to the root.
 */
import { ENVS, parseArgs, required } from './lib/args.mjs';
import { storageFor, updateJson } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env');
const { app, env } = args;
if (!ENVS.includes(env)) throw new Error(`--env must be one of ${ENVS.join(', ')}`);

const storage = storageFor(env, args.provider);
const key = `_deploy/releases/${app}.json`;
const history = storage.readJson(key).value ?? [];
if (history.length < 2 && !args.to) throw new Error(`${app} has no earlier release in ${env}`);
const current = history.at(-1);
const target = args.to ? history.findLast((r) => r.version === args.to) : history.at(-2);
if (!target) throw new Error(`Version ${args.to} of ${app} was never deployed to ${env}`);

if (app === 'shell') {
  storage.copyDir(`shell/${target.version}`, '');
} else {
  await updateJson(storage, 'mf-manifest.json', {}, (m) => ({ ...m, [app]: target.url }));
}
await updateJson(storage, key, [], (r) => [
  ...r,
  { ...target, at: new Date().toISOString(), by: process.env.GITLAB_USER_LOGIN ?? process.env.USER, rollbackFrom: current.version },
]);
console.log(`✔ Rolled back ${app} in ${env}: ${current.version} -> ${target.version}`);
```
Rolling back the shell does not restore `app-config.json`; bucket versioning does, if needed.

## `tools/ci/contract-smoke.mjs`
```js
#!/usr/bin/env node
/**
 * @file Post-deploy contract smoke. For the app's LIVE manifest entry in <env>, checks that remoteEntry.json is reachable
 * (through CloudFront when PUBLIC_BASE_URL is set), its name matches, it exposes exactly what federation.config.js declares,
 * and every shared singleton was built with the version pinned in package.json (strictVersion would fail at runtime).
 *   node tools/ci/contract-smoke.mjs --app <app> --env dev [--provider local|s3] [--expect-shared-empty] [--federation-config <path>]
 */
import { existsSync, readFileSync } from 'node:fs';
import { parseArgs, required } from './lib/args.mjs';
import { publicBase, storageFor } from './lib/storage.mjs';

const args = parseArgs();
required(args, 'app', 'env');
const { app, env } = args;
const storage = storageFor(env, args.provider);
const errors = [];

if (app === 'shell') {
  if (!storage.exists('index.html') || !storage.exists('mf-manifest.json')) throw new Error('shell not deployed');
  if (publicBase()) {
    const res = await fetch(`${publicBase()}/`);
    if (!res.ok) throw new Error(`${publicBase()}/ -> HTTP ${res.status}`);
  }
  console.log(`✔ shell is live in ${env}`);
  process.exit(0);
}

const manifest = storage.readJson('mf-manifest.json').value ?? {};
const url = manifest[app];
if (!url) throw new Error(`${app} is not in the ${env} manifest`);

const entry = /^https?:/.test(url)
  ? await fetch(url).then((r) => { if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`); return r.json(); })
  : storage.readJson(url.replace(/^\/+/, '')).value;
if (!entry) throw new Error(`Cannot read ${url}`);

if (entry.name !== app) errors.push(`remoteEntry name "${entry.name}" != "${app}"`);

const fedConfig = args['federation-config'] ?? `apps/${app}/federation.config.js`;
if (existsSync(fedConfig)) {
  const declared = [...readFileSync(fedConfig, 'utf8').matchAll(/'(\.\/[A-Za-z0-9]+)':/g)].map((m) => m[1]).sort();
  const exposed = entry.exposes.map((e) => e.key).sort();
  if (JSON.stringify(declared) !== JSON.stringify(exposed)) errors.push(`exposes ${exposed} != declared ${declared}`);
}

if (args['expect-shared-empty']) {
  if ((entry.shared ?? []).length) errors.push(`isolated remote must share nothing, found ${entry.shared.length} shared deps`);
} else if (existsSync('package.json')) {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const pinned = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const s of (entry.shared ?? []).filter((s) => s.singleton && pinned[s.packageName])) {
    const want = pinned[s.packageName].replace(/^file:.*-(\d+\.\d+\.\d+)\.tgz$/, '$1');
    if (s.version && s.version !== want) errors.push(`${s.packageName} built with ${s.version}, platform pins ${want}`);
  }
}

if (errors.length) { errors.forEach((e) => console.error('✘ ' + e)); process.exit(1); }
console.log(`✔ ${app} in ${env}: exposes ${entry.exposes.map((e) => e.key).join(', ')}; ${(entry.shared ?? []).length} shared deps OK`);
```

## `tools/ci/serve-env.mjs` (serve a local dry-run deploy like CloudFront would)
```js
#!/usr/bin/env node
/**
 * @file Serves dist/deploy/<env> like the CDN: extension-less paths → index.html, no-cache root files, immutable rest,
 * _deploy/ denied. `node tools/ci/serve-env.mjs dev [port=8080]`, then `BASE_URL=http://localhost:8080 npm run e2e`.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const env = process.argv[2] ?? 'dev';
const port = Number(process.argv[3] ?? 8080);
const root = join(process.env.LOCAL_DEPLOY_ROOT ?? 'dist/deploy', env);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (urlPath.startsWith('/_deploy/')) return res.writeHead(403).end();
  let file = normalize(join(root, urlPath));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) file = extname(urlPath) ? '' : join(root, 'index.html');
  if (!file || !existsSync(file)) return res.writeHead(404).end('not found'); // never index.html for a missing asset
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': /(^|\/)(index\.html|mf-manifest\.json|app-config\.json)$/.test(file) ? 'no-cache' : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
```

## Dry run end to end (before touching AWS)
```bash
npx nx run-many -t build -c mock
node tools/ci/deploy-app.mjs --app shell --env dev --version v1 --provider local
node tools/ci/deploy-app.mjs --app mfe-<x> --env dev --version v1 --provider local
node tools/ci/contract-smoke.mjs --app mfe-<x> --env dev --provider local
node tools/ci/serve-env.mjs dev 8080 &
BASE_URL=http://localhost:8080 PW_CHANNEL=chrome npm run e2e
node tools/ci/deploy-app.mjs --app mfe-<x> --env dev --version v2 --provider local
node tools/ci/rollback-app.mjs --app mfe-<x> --env dev --provider local     # manifest back to v1
```

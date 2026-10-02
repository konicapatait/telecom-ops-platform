#!/usr/bin/env node
/**
 * Serves a LOCAL deploy (dist/deploy/<env>) like the CDN would: SPA fallback to index.html, CORS on.
 *   node tools/ci/serve-env.mjs dev [port=8080]
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const env = process.argv[2] ?? 'dev';
const port = Number(process.argv[3] ?? 8080);
const root = join(process.env.LOCAL_DEPLOY_ROOT ?? 'dist/deploy', env);
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(root, urlPath));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) file = extname(urlPath) ? '' : join(root, 'index.html');
  if (!file || !existsSync(file)) return res.writeHead(404).end('not found');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': /index\.html|mf-manifest\.json|app-config\.json/.test(file)
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
  });
  createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));

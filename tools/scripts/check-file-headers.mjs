#!/usr/bin/env node
/**
 * @file Fails when a source file does not start with a header comment saying what it is for (code conventions).
 *
 * Applies to .ts/.mts/.js/.mjs under apps/, libs/ and tools/ (specs, generator templates and generated
 * vendor files excluded). A header is any leading comment: `/** @file … *\/`, `/* … *\/`, `// …` or a shebang.
 *   node tools/scripts/check-file-headers.mjs      (npm run check:headers)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['apps', 'libs', 'tools'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'files', 'assets', '.angular']);
const SKIP_FILES = [/\.spec\.ts$/, /mockServiceWorker\.js$/, /tsconfig\.federation\.json$/];

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return SKIP_DIRS.has(f) ? [] : walk(p);
    return [p];
  });

const missing = ROOTS.flatMap(walk)
  .filter((f) => /\.(ts|mts|js|mjs)$/.test(f) && !SKIP_FILES.some((re) => re.test(f)))
  .filter((f) => !/^(\/\*|\/\/|#!)/.test(readFileSync(f, 'utf8').trimStart()));

if (missing.length) {
  missing.forEach((f) => console.error(`✘ ${f}: add a header comment (/** @file <what this file is for> */)`));
  process.exit(1);
}
console.log('✔ Every source file starts with a header comment.');

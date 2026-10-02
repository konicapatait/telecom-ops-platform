/** Tiny `--key value` parser for the CI scripts (no dependency). */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      out[key] = next && !next.startsWith('--') ? (i++, next) : true;
    }
  }
  return out;
}

export function required(args, ...keys) {
  for (const k of keys) if (!args[k]) throw new Error(`Missing --${k}`);
}

export const ENVS = ['dev', 'staging', 'prod'];

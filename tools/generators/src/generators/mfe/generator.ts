/**
 * @file The `mfe` workspace generator: creates a remote (domain, capability, hub) and wires manifest, contracts, shell/hub registration and CODEOWNERS (ADR-0015).
 */
import {
  Tree,
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  readJson,
  writeJson,
  type ProjectConfiguration,
  type TargetConfiguration,
} from '@nx/devkit';
import * as path from 'path';
import type { MfeGeneratorSchema } from './schema';

const LOCAL_MANIFEST = 'libs/mf-manifest/manifests/local/mf-manifest.json';
const REMOTE_NAMES_FILE = 'libs/contracts/src/lib/remotes.ts';
const SHELL_REGISTRY_FILE = 'apps/shell/src/app/routing/remote-registry.ts';
/** Case domains are tabs of the case-management hub, not shell sections (ADR-0022). */
const HUB_TABS_FILE = 'apps/mfe-case-management/src/app/case-management.tabs.ts';
const CODEOWNERS = '.gitlab/CODEOWNERS';
const NAV_GROUP: Record<string, string> = {
  case: 'Case management',
  '360': 'Full profiles',
  reporting: 'Insights',
};

export interface NormalizedOptions extends Required<Omit<MfeGeneratorSchema, 'skipFormat' | 'caseDomain'>> {
  caseDomain: string;
  constName: string;
  templateDir: 'domain' | 'domain-case' | 'domain-360' | 'capability';
  projectName: string;
  projectRoot: string;
  prefix: string;
  className: string;
  fileName: string;
  tags: string[];
  skipFormat: boolean;
}

export function normalizeOptions(tree: Tree, raw: MfeGeneratorSchema): NormalizedOptions {
  // The CLI parses `--family=360` as a number.
  const o: MfeGeneratorSchema = {
    ...raw,
    family: raw.family === undefined ? undefined : (String(raw.family) as MfeGeneratorSchema['family']),
  };
  const base = o.name.replace(/^mfe-(cap-)?/, '');
  const fileName = names(base).fileName;
  const projectName = o.name.startsWith('mfe-')
    ? o.name
    : o.kind === 'capability'
      ? `mfe-cap-${fileName}`
      : `mfe-${fileName}`;
  const family = o.kind === 'capability' ? 'capability' : o.kind === 'hub' ? 'case' : (o.family ?? 'case');
  const route = o.route ?? fileName;
  const isCaseDomain = o.kind === 'domain' && family === 'case';
  if (isCaseDomain && !o.caseDomain)
    throw new Error('--caseDomain is required for --kind=domain --family=case (e.g. BILLING_DISPUTE)');
  return {
    name: base,
    kind: o.kind,
    family: family as NormalizedOptions['family'],
    route,
    label: o.label ?? names(base).className.replace(/([a-z])([A-Z])/g, '$1 $2'),
    entitlement: o.entitlement ?? `${route}:view`,
    exposedName: o.exposedName ?? names(base).className,
    port: o.port ?? nextFreePort(tree),
    owner: o.owner ?? '@telecom/platform-team',
    skipFormat: o.skipFormat ?? false,
    projectName,
    projectRoot: `apps/${projectName}`,
    prefix: fileName.replace(/-/g, ''),
    className: names(base).className,
    fileName,
    tags: ['type:app', `family:${family}`, `kind:${o.kind}`],
    caseDomain: o.caseDomain ?? '',
    constName: names(base).constantName,
    // A hub starts from the placeholder section template; its tab host is hand-built (see mfe-case-management).
    templateDir:
      o.kind === 'capability'
        ? 'capability'
        : isCaseDomain
          ? 'domain-case'
          : o.kind === 'domain' && family === '360'
            ? 'domain-360'
            : 'domain',
  };
}

function nextFreePort(tree: Tree): number {
  const manifest: Record<string, string> = tree.exists(LOCAL_MANIFEST) ? readJson(tree, LOCAL_MANIFEST) : {};
  const used = Object.values(manifest).map((u) => Number(/:(\d+)\//.exec(u)?.[1] ?? 0));
  return Math.max(4200, ...used) + 1;
}

function projectConfig(o: NormalizedOptions): ProjectConfiguration {
  const root = o.projectRoot;
  const n = o.projectName;
  const fileReplacement = (file: string, withFile: string) => ({
    replace: `${root}/src/${file}`,
    with: `${root}/src/${withFile}`,
  });
  const esbuild: TargetConfiguration = {
    executor: '@angular/build:application',
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: `dist/apps/${n}`,
      index: `${root}/src/index.html`,
      browser: `${root}/src/main.ts`,
      polyfills: ['es-module-shims'],
      tsConfig: `${root}/tsconfig.app.json`,
      assets: [],
      styles: [],
    },
    configurations: {
      production: {
        budgets: [
          { type: 'anyScript', maximumWarning: '150kb', maximumError: '300kb' },
          { type: 'anyComponentStyle', maximumWarning: '4kb', maximumError: '8kb' },
        ],
        outputHashing: 'all',
        fileReplacements: [
          fileReplacement('environments/environment.ts', 'environments/environment.prod.ts'),
          fileReplacement('start-mocks.ts', 'start-mocks.prod.ts'),
        ],
      },
      mock: {
        outputPath: `dist/apps-mock/${n}`,
        outputHashing: 'all',
        fileReplacements: [fileReplacement('environments/environment.ts', 'environments/environment.mock.ts')],
      },
      // Standalone dev harness only: tokens/reset are loaded here because the shell is not present.
      // Remotes never ship global CSS when composed (ADR-0001).
      development: {
        optimization: false,
        extractLicenses: false,
        sourceMap: true,
        assets: [{ glob: 'mockServiceWorker.js', input: 'libs/mocks/assets', output: '/' }],
        styles: ['node_modules/@org/design-tokens/tokens.css', 'node_modules/@org/design-tokens/reset.css'],
      },
    },
    defaultConfiguration: 'production',
  };
  return {
    name: n,
    root,
    projectType: 'application',
    sourceRoot: `${root}/src`,
    prefix: o.prefix,
    tags: o.tags,
    targets: {
      build: {
        executor: '@angular-architects/native-federation:build',
        outputs: [`{workspaceRoot}/dist/apps/${n}`, `{workspaceRoot}/dist/apps-mock/${n}`],
        options: {},
        configurations: {
          production: { target: `${n}:esbuild:production` },
          mock: { target: `${n}:esbuild:mock` },
          development: { target: `${n}:esbuild:development`, dev: true },
        },
        defaultConfiguration: 'production',
      },
      esbuild,
      serve: {
        executor: '@angular-architects/native-federation:build',
        continuous: true,
        options: {
          target: `${n}:serve-original:development`,
          rebuildDelay: 500,
          dev: true,
          cacheExternalArtifacts: false,
          port: 0,
        },
      },
      'serve-original': {
        executor: '@angular/build:dev-server',
        continuous: true,
        options: { port: o.port },
        configurations: {
          production: { buildTarget: `${n}:esbuild:production` },
          development: { buildTarget: `${n}:esbuild:development` },
        },
        defaultConfiguration: 'development',
      },
    },
  };
}

/** Inserts `line` immediately before the `// <generator:...>` marker, once. */
export function insertBeforeMarker(tree: Tree, file: string, marker: string, line: string): void {
  const content = tree.read(file, 'utf-8');
  if (!content) throw new Error(`${file} not found`);
  if (content.includes(line.trim())) return;
  const idx = content.indexOf(marker);
  if (idx < 0) throw new Error(`Marker "${marker}" missing in ${file}`);
  const lineStart = content.lastIndexOf('\n', idx) + 1;
  const indent = content.slice(lineStart, idx);
  tree.write(file, content.slice(0, lineStart) + indent + line.trim() + '\n' + content.slice(lineStart));
}

export async function mfeGenerator(tree: Tree, schema: MfeGeneratorSchema): Promise<void> {
  const o = normalizeOptions(tree, schema);
  if (tree.exists(o.projectRoot)) throw new Error(`${o.projectRoot} already exists`);

  addProjectConfiguration(tree, o.projectName, projectConfig(o));

  const vars = { ...o, tmpl: '', dot: '.', navGroup: NAV_GROUP[o.family] ?? '' };
  // Kind-specific templates are written second, so they override common ones with the same path.
  generateFiles(tree, path.join(__dirname, 'files', 'common'), o.projectRoot, vars);
  generateFiles(tree, path.join(__dirname, 'files', o.templateDir), o.projectRoot, vars);

  // 1. Typed remote name (contracts)
  insertBeforeMarker(tree, REMOTE_NAMES_FILE, '// <generator:remote-names>', `'${o.projectName}',`);

  // 2. Local manifest entry (deployed environments are written by the deploy job, ADR-0007)
  const manifest: Record<string, string> = tree.exists(LOCAL_MANIFEST) ? readJson(tree, LOCAL_MANIFEST) : {};
  manifest[o.projectName] = `http://localhost:${o.port}/remoteEntry.json`;
  writeJson(tree, LOCAL_MANIFEST, Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))));

  // 3. Where the section is mounted
  const ent = o.entitlement ? `, entitlement: '${o.entitlement}'` : '';
  if (o.templateDir === 'domain-case' && tree.exists(HUB_TABS_FILE)) {
    // Case domains load as tabs of the case-management hub (ADR-0022).
    insertBeforeMarker(
      tree,
      HUB_TABS_FILE,
      '// <generator:case-tabs>',
      `{ id: '${o.route}', label: '${o.label}', path: '${o.route}', remote: '${o.projectName}', domains: [{ domain: '${o.caseDomain}', subPath: '' }]${ent} },`,
    );
  } else if ((o.kind === 'domain' || o.kind === 'hub') && tree.exists(SHELL_REGISTRY_FILE)) {
    const opens = o.kind === 'hub' ? ', opensCases: true' : '';
    insertBeforeMarker(
      tree,
      SHELL_REGISTRY_FILE,
      '// <generator:shell-routes>',
      `{ remote: '${o.projectName}', path: '${o.route}', label: '${o.label}', group: '${NAV_GROUP[o.family]}'${ent}${opens} },`,
    );
  }

  // 4. Ownership
  if (tree.exists(CODEOWNERS)) {
    const owners = tree.read(CODEOWNERS, 'utf-8') ?? '';
    if (!owners.includes(`/${o.projectRoot}/`))
      tree.write(CODEOWNERS, owners.trimEnd() + `\n/${o.projectRoot}/ ${o.owner}\n`);
  }

  if (!o.skipFormat) await formatFiles(tree);
}

export default mfeGenerator;

# The `mfe` workspace generator: complete code

`npx nx g @platform/tools:mfe <name> --kind=domain|capability|hub [...]` is the only way to create an app (ADR-0013). It creates the app from templates, its Nx targets (production / mock / development), the pipeline file, the `REMOTE_NAMES` entry, a local manifest port, the shell registry entry (domain, hub) and a CODEOWNERS line. Changing templates later does not migrate existing apps.

Layout:
```
tools/generators/
├─ package.json           { "name": "@platform/tools", "private": true, "type": "commonjs", "main": "./src/index.ts", "generators": "./generators.json" }
├─ generators.json
├─ project.json           tags: ["type:tooling"]
└─ src/
   ├─ index.ts            export * from './generators/mfe/generator';
   └─ generators/mfe/
      ├─ generator.ts  schema.json  schema.d.ts
      └─ files/{common,domain,capability}/…   (EJS templates, suffix __tmpl__)
```
`generators.json`:
```json
{ "generators": { "mfe": { "factory": "./src/generators/mfe/generator", "schema": "./src/generators/mfe/schema.json",
  "description": "Create a federation remote (domain, capability, hub) with manifest entry, tags, pipeline file and dev harness." } } }
```
Add to root `package.json` devDependencies: `"@platform/tools": "file:tools/generators"` (or rely on the tsconfig path), and `@nx/devkit` at the Nx version.

## `schema.json`
```json
{
  "$schema": "https://json-schema.org/schema",
  "$id": "PlatformMfe",
  "title": "Create a federation remote",
  "type": "object",
  "properties": {
    "name": { "type": "string", "description": "Short name, e.g. 'orders' or 'notes'. Becomes mfe-<name> or mfe-cap-<name>.", "$default": { "$source": "argv", "index": 0 }, "x-prompt": "Remote name?" },
    "kind": { "type": "string", "enum": ["domain", "capability", "hub"], "x-prompt": { "message": "Kind?", "type": "list", "items": ["domain", "capability", "hub"] } },
    "family": { "type": "string", "description": "Domain/hub: layout family tag (lint). Default 'standalone' = no family layout lib." },
    "route": { "type": "string", "description": "Domain/hub: URL segment under the shell (default: name)." },
    "label": { "type": "string", "description": "Nav label / capability label (default: Title Case of name)." },
    "group": { "type": "string", "description": "Domain/hub: nav group (default: label)." },
    "entitlement": { "type": "string", "description": "Domain/hub: entitlement to see the section (default '<route>:view')." },
    "exposedName": { "type": "string", "description": "Capability: exposed module, e.g. 'Notes' -> './Notes' (default PascalCase of name)." },
    "port": { "type": "number", "description": "Dev server port (default: next free after the local manifest's highest)." },
    "owner": { "type": "string", "description": "CODEOWNERS owner, e.g. @group/team." },
    "skipFormat": { "type": "boolean", "default": false }
  },
  "required": ["name", "kind"]
}
```

## `schema.d.ts`
```ts
/** @file Options of the `mfe` generator (mirrors schema.json). */
export interface MfeGeneratorSchema {
  name: string;
  kind: 'domain' | 'capability' | 'hub';
  family?: string;
  route?: string;
  label?: string;
  group?: string;
  entitlement?: string;
  exposedName?: string;
  port?: number;
  owner?: string;
  skipFormat?: boolean;
}
```

## `generator.ts`
```ts
/**
 * @file The `mfe` generator: creates a remote and wires manifest, contracts, shell registration and CODEOWNERS (ADR-0013).
 */
import { Tree, addProjectConfiguration, formatFiles, generateFiles, names, readJson, writeJson, type ProjectConfiguration, type TargetConfiguration } from '@nx/devkit';
import * as path from 'path';
import type { MfeGeneratorSchema } from './schema';

const LOCAL_MANIFEST = 'libs/mf-manifest/manifests/local/mf-manifest.json';
const REMOTE_NAMES_FILE = 'libs/contracts/src/lib/remotes.ts';
const SHELL_REGISTRY_FILE = 'apps/shell/src/app/routing/remote-registry.ts';
const CODEOWNERS = '.gitlab/CODEOWNERS';
const DEFAULT_OWNER = '@<group>/platform-team';
const DESIGN_TOKENS_CSS = ['node_modules/<design-tokens>/tokens.css', 'node_modules/<design-tokens>/reset.css'];

export interface NormalizedOptions {
  name: string; kind: MfeGeneratorSchema['kind']; family: string; route: string; label: string; group: string;
  entitlement: string; exposedName: string; port: number; owner: string; skipFormat: boolean;
  projectName: string; projectRoot: string; prefix: string; className: string; fileName: string; tags: string[];
  templateDir: 'domain' | 'capability';
}

export function normalizeOptions(tree: Tree, o: MfeGeneratorSchema): NormalizedOptions {
  const base = o.name.replace(/^mfe-(cap-)?/, '');
  const n = names(base);
  const projectName = o.name.startsWith('mfe-') ? o.name : o.kind === 'capability' ? `mfe-cap-${n.fileName}` : `mfe-${n.fileName}`;
  const family = o.kind === 'capability' ? 'capability' : String(o.family ?? 'standalone'); // String(): CLI may coerce digits
  const route = o.route ?? n.fileName;
  const label = o.label ?? n.className.replace(/([a-z])([A-Z])/g, '$1 $2');
  return {
    name: base, kind: o.kind, family, route, label, group: o.group ?? label,
    entitlement: o.entitlement ?? `${route}:view`,
    exposedName: o.exposedName ?? n.className,
    port: o.port ?? nextFreePort(tree),
    owner: o.owner ?? DEFAULT_OWNER,
    skipFormat: o.skipFormat ?? false,
    projectName, projectRoot: `apps/${projectName}`,
    prefix: n.fileName.replace(/-/g, ''), className: n.className, fileName: n.fileName,
    tags: ['type:app', `family:${family}`, `kind:${o.kind}`],
    templateDir: o.kind === 'capability' ? 'capability' : 'domain', // a hub starts from the domain template
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
  const fr = (file: string, withFile: string) => ({ replace: `${root}/src/${file}`, with: `${root}/src/${withFile}` });
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
        fileReplacements: [fr('environments/environment.ts', 'environments/environment.prod.ts'), fr('start-mocks.ts', 'start-mocks.prod.ts')],
      },
      mock: {
        outputPath: `dist/apps-mock/${n}`,
        outputHashing: 'all',
        fileReplacements: [fr('environments/environment.ts', 'environments/environment.mock.ts')],
      },
      // Standalone dev harness only: global tokens/reset load here because the shell is absent (ADR-0001).
      development: {
        optimization: false, extractLicenses: false, sourceMap: true,
        assets: [{ glob: 'mockServiceWorker.js', input: 'libs/mocks/assets', output: '/' }],
        styles: DESIGN_TOKENS_CSS,
      },
    },
    defaultConfiguration: 'production',
  };
  return {
    name: n, root, projectType: 'application', sourceRoot: `${root}/src`, prefix: o.prefix, tags: o.tags,
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
        options: { target: `${n}:serve-original:development`, rebuildDelay: 500, dev: true, cacheExternalArtifacts: false, port: 0 },
      },
      'serve-original': {
        executor: '@angular/build:dev-server',
        continuous: true,
        options: { port: o.port },
        configurations: { production: { buildTarget: `${n}:esbuild:production` }, development: { buildTarget: `${n}:esbuild:development` } },
        defaultConfiguration: 'development',
      },
    },
  };
}

/** Inserts `line` immediately before the `// <generator:...>` marker, once (idempotent). */
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
  const vars = { ...o, tmpl: '', dot: '.' };
  // Kind-specific templates second, so they override common ones with the same path.
  generateFiles(tree, path.join(__dirname, 'files', 'common'), o.projectRoot, vars);
  generateFiles(tree, path.join(__dirname, 'files', o.templateDir), o.projectRoot, vars);

  // 1. Typed remote name
  insertBeforeMarker(tree, REMOTE_NAMES_FILE, '// <generator:remote-names>', `'${o.projectName}',`);

  // 2. Local manifest (deployed environments are written by the deploy job, ADR-0006)
  const manifest: Record<string, string> = tree.exists(LOCAL_MANIFEST) ? readJson(tree, LOCAL_MANIFEST) : {};
  manifest[o.projectName] = `http://localhost:${o.port}/remoteEntry.json`;
  writeJson(tree, LOCAL_MANIFEST, Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))));

  // 3. Shell section (domain, hub). Capabilities are mounted by a host, not routed.
  if (o.kind !== 'capability') {
    insertBeforeMarker(
      tree, SHELL_REGISTRY_FILE, '// <generator:shell-routes>',
      `{ remote: '${o.projectName}', path: '${o.route}', label: '${o.label}', group: '${o.group}', entitlement: '${o.entitlement}' },`,
    );
  }

  // 4. Ownership
  if (tree.exists(CODEOWNERS)) {
    const owners = tree.read(CODEOWNERS, 'utf-8') ?? '';
    if (!owners.includes(`/${o.projectRoot}/`)) tree.write(CODEOWNERS, owners.trimEnd() + `\n/${o.projectRoot}/ ${o.owner}\n`);
  }

  if (!o.skipFormat) await formatFiles(tree);
}

export default mfeGenerator;
```
Add a family tag to `eslint.config.mjs` depConstraints when you use a new `--family` (default `family:standalone` needs `{ sourceTag: 'family:standalone', onlyDependOnLibsWithTags: ['scope:shared'] }`).

Write a spec (`generator.spec.ts`, `createTreeWithEmptyWorkspace()` with the three marker files seeded) that asserts the files, the registry line, the manifest port and the CODEOWNERS line.

---

## Templates: `files/common/`
File names: `__fileName__` → `fileName`, `__dot__` → `.`, `__tmpl__` suffix stripped.

`__dot__gitlab-ci.yml__tmpl__`
```yaml
# <%= projectName %> pipeline. Job bodies live in ci/templates/app.gitlab-ci.yml (ADR-0008).
# Included into the child pipeline only when affected, or when run alone with APP=<%= projectName %>.
<%= projectName %>:lint:
  extends: .app-lint
  variables: { APP: <%= projectName %> }
<%= projectName %>:test:
  extends: .app-test
  variables: { APP: <%= projectName %> }
<%= projectName %>:build:
  extends: .app-build
  variables: { APP: <%= projectName %> }
<%= projectName %>:deploy:dev:
  extends: .app-deploy-dev
  variables: { APP: <%= projectName %> }
  needs: ['<%= projectName %>:build', '<%= projectName %>:lint', '<%= projectName %>:test']
<%= projectName %>:smoke:dev:
  extends: .app-contract-smoke
  variables: { APP: <%= projectName %>, DEPLOY_ENV: dev }
  needs: ['<%= projectName %>:deploy:dev']
<%= projectName %>:deploy:staging:
  extends: .app-deploy-staging
  variables: { APP: <%= projectName %> }
  needs: ['<%= projectName %>:build', '<%= projectName %>:smoke:dev']
<%= projectName %>:deploy:prod:
  extends: .app-deploy-prod
  variables: { APP: <%= projectName %> }
  needs: ['<%= projectName %>:build', '<%= projectName %>:deploy:staging']
<%= projectName %>:rollback:prod:
  extends: .app-rollback
  variables: { APP: <%= projectName %>, DEPLOY_ENV: prod }
  needs: []
```

`README.md__tmpl__`
```md
# <%= projectName %>
<%= kind %> remote. Owner: <%= owner %>. Dev: `npx nx serve <%= projectName %>` (port <%= port %>, mocks on). Composed: `npm run start:all`.
```

`eslint.config.mjs__tmpl__`
```js
/** @file ESLint configuration for <%= projectName %>. */
import { angularEslintConfig } from '../../tools/eslint/angular.config.mjs';
export default angularEslintConfig('<%= prefix %>');
```

`vite.config.mts__tmpl__`
```ts
/** @file Vitest configuration for <%= projectName %>. */
import { angularVitestConfig } from '../../tools/vitest/angular-vitest.config.mts';
export default angularVitestConfig(__dirname);
```

`tsconfig.json__tmpl__`, `tsconfig.app.json__tmpl__`, `tsconfig.spec.json__tmpl__`
```json
{ "extends": "../../tsconfig.base.json", "files": [], "include": [], "references": [{ "path": "./tsconfig.app.json" }, { "path": "./tsconfig.spec.json" }] }
```
```json
{ "extends": "./tsconfig.json", "compilerOptions": { "outDir": "../../dist/out-tsc", "types": [] },
  "files": ["src/main.ts"], "include": ["src/**/*.ts"], "exclude": ["src/**/*.spec.ts", "src/**/*.test.ts"] }
```
```json
{ "extends": "./tsconfig.json", "compilerOptions": { "outDir": "../../dist/out-tsc", "types": ["vitest/globals", "node"] },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"] }
```

`src/index.html__tmpl__`
```html
<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title><%= projectName %> · dev harness</title><base href="/" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body><<%= prefix %>-dev-harness></<%= prefix %>-dev-harness></body>
</html>
```

`src/main.ts__tmpl__`
```ts
/** @file Standalone entry of <%= projectName %> (dev harness). Composed in the shell, only the exposed modules run. */
import { initFederation } from '@angular-architects/native-federation';

initFederation()
  .then(() => import('./bootstrap'))
  .catch((err) => console.error('[platform] FATAL <%= projectName %> failed to start (before the logger exists)', err));
```

`src/bootstrap.ts__tmpl__`
```ts
/** @file Bootstraps <%= projectName %>'s standalone dev harness after initFederation (mocks first, then Angular). */
import { bootstrapApplication } from '@angular/platform-browser';
import { installPlatformDiagnostics } from '@platform/mf-manifest';
import { createLogger } from '@platform/utils';
import { harnessConfig } from './app/app.config';
import { DevHarnessComponent } from './app/dev-harness.component';
import { startMocks } from './start-mocks';

const log = createLogger('<%= projectName %>');

startMocks()
  .then((mockProviders) => bootstrapApplication(DevHarnessComponent, harnessConfig(mockProviders)))
  .then(() => { installPlatformDiagnostics({ app: '<%= projectName %>', standalone: true }); log.info('Dev harness started'); })
  .catch((err) => log.error('Dev harness failed to start', { reason: String(err) }));
```

`src/environments/environment.ts__tmpl__` / `.mock.ts__tmpl__` / `.prod.ts__tmpl__`
```ts
/** @file Build-time flags for <%= projectName %> (development | mock: true/true, production: false/false). */
export const environment = { mocks: true, mockAuth: true };
```

`src/start-mocks.ts__tmpl__` and `src/start-mocks.prod.ts__tmpl__`
```ts
/** @file Mock wiring for <%= projectName %>'s harness; the ONLY place it may import @platform/mocks (ADR-0005). */
import type { EnvironmentProviders } from '@angular/core';
import { provideMockAuth } from '@platform/auth-mock';
import { PERSONAS, allHandlers, startMockWorker } from '@platform/mocks';
import { environment } from './environments/environment';

export async function startMocks(): Promise<EnvironmentProviders[]> {
  if (environment.mocks) await startMockWorker(allHandlers);
  return environment.mockAuth ? [provideMockAuth(PERSONAS)] : [];
}
```
```ts
/** @file Production stub of start-mocks.ts for <%= projectName %> (ADR-0005). */
import type { EnvironmentProviders } from '@angular/core';
export async function startMocks(): Promise<EnvironmentProviders[]> { return []; }
```

`src/app/app.config.ts__tmpl__`
```ts
/** @file Providers for <%= projectName %>'s STANDALONE dev harness. Composed, the shell's providers apply instead. */
import { ApplicationConfig, EnvironmentProviders, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { authInterceptor, provideAuth } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';
import { correlationIdInterceptor } from '@platform/utils';
import { HARNESS_ROUTES } from './harness.routes';

export function harnessConfig(mockProviders: EnvironmentProviders[]): ApplicationConfig {
  return {
    providers: [
      provideZonelessChangeDetection(),
      provideBrowserGlobalErrorListeners(),
      provideRouter(HARNESS_ROUTES, withComponentInputBinding()),
      provideHttpClient(withFetch(), withInterceptors([correlationIdInterceptor, authInterceptor])),
      provideAuth({ issuer: '', clientId: '', redirectUri: location.origin }),
      ...mockProviders,
      provideAppInitializer(() => inject(EntitlementsService).load().catch(() => undefined)),
    ],
  };
}
```

## Templates: `files/domain/` (also used for hubs)

`federation.config.js__tmpl__`
```js
// @file Native Federation config for <%= projectName %>. Shared deps come only from libs/mf-manifest (ADR-0007).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');
module.exports = withPlatformFederation({
  name: '<%= projectName %>',
  exposes: { './Routes': './apps/<%= projectName %>/src/app/<%= fileName %>.routes.ts' },
});
```

`src/app/__fileName__.routes.ts__tmpl__`
```ts
/** @file Routes of <%= projectName %>, exposed to the shell as './Routes' and mounted at /<%= route %> (ADR-0003). */
import type { Routes } from '@angular/router';
import { entitlementGuard } from '@platform/entitlements';
import { <%= className %>HomeComponent } from './<%= fileName %>-home.component';

export default [
  {
    path: '',
    canActivate: [entitlementGuard('<%= entitlement %>')],
    children: [{ path: '', component: <%= className %>HomeComponent, title: '<%= label %>' }],
  },
] satisfies Routes;
```

`src/app/__fileName__-home.component.ts__tmpl__`
```ts
/** @file Placeholder landing page of <%= projectName %>; replace with the section's first real page. */
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@platform/auth';
import { EntitlementsService } from '@platform/entitlements';

@Component({
  selector: '<%= prefix %>-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1><%= label %></h1>
    <p><%= projectName %> is wired up. Build this section's first page here.</p>
    <!-- Proves the federation singletons: same AuthService/EntitlementsService instances as the shell. -->
    <p>Signed in as {{ auth.user()?.displayName ?? 'nobody' }} · {{ entitlements.count() }} entitlements</p>
  `,
})
export class <%= className %>HomeComponent {
  protected readonly auth = inject(AuthService);
  protected readonly entitlements = inject(EntitlementsService);
}
```

`src/app/harness.routes.ts__tmpl__`
```ts
/** @file Routes of <%= projectName %>'s dev harness, mirroring how the shell mounts it, so links behave the same. */
import type { Routes } from '@angular/router';
export const HARNESS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '<%= route %>' },
  { path: '<%= route %>', loadChildren: () => import('./<%= fileName %>.routes') },
];
```

`src/app/dev-harness.component.ts__tmpl__`
```ts
/** @file Dev harness of <%= projectName %> for `nx serve` (standalone only; never loaded by the shell). */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: '<%= prefix %>-dev-harness',
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<header>Dev harness · <strong><%= projectName %></strong> · mocks on</header><main><router-outlet /></main>`,
})
export class DevHarnessComponent {}
```

## Templates: `files/capability/`

`federation.config.js__tmpl__`
```js
// @file Native Federation config for <%= projectName %>. A capability exposes exactly ONE component (ADR-0003, ADR-0007).
const { withPlatformFederation } = require('../../libs/mf-manifest/src/shared.config');
module.exports = withPlatformFederation({
  name: '<%= projectName %>',
  exposes: { './<%= exposedName %>': './apps/<%= projectName %>/src/app/<%= fileName %>.component.ts' },
});
```

`src/app/__fileName__.component.ts__tmpl__`
```ts
/**
 * @file <%= label %> capability, exposed as './<%= exposedName %>'. Inputs follow a NAMED contract in @platform/contracts
 * (add `<%= className %>Inputs` there); fetch your own data; never read the route (ADR-0003).
 */
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: '<%= prefix %>-<%= fileName %>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [attr.aria-label]="'<%= label %> for ' + subjectId()"><h2><%= label %></h2><p>Subject <code>{{ subjectId() }}</code></p></section>`,
})
export class <%= className %>Component {
  /** Rename to match the capability's Inputs contract. */
  readonly subjectId = input.required<string>();
}

export default <%= className %>Component;
```

`src/app/dev-harness.component.ts__tmpl__`
```ts
/** @file Dev harness of <%= projectName %>: renders the capability with an id you type, like a host would. */
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { <%= className %>Component } from './<%= fileName %>.component';

@Component({
  selector: '<%= prefix %>-dev-harness',
  imports: [<%= className %>Component],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>Dev harness · <strong><%= projectName %></strong>
      <label>Subject id <input [value]="subjectId()" (change)="subjectId.set($any($event.target).value)" /></label>
    </header>
    <main><<%= prefix %>-<%= fileName %> [subjectId]="subjectId()" /></main>
  `,
})
export class DevHarnessComponent {
  protected readonly subjectId = signal('demo-1');
}
```
Never import fixtures into the harness: it is part of the production build graph. If the harness needs fixture ids, provide them through an injection token set only in `start-mocks.ts`.

`src/app/harness.routes.ts__tmpl__`
```ts
/** @file Capabilities are not routed; the harness renders the component directly. */
import type { Routes } from '@angular/router';
export const HARNESS_ROUTES: Routes = [];
```

# Workspace configuration: complete files

## Known-good version set
These versions were verified working together (lint, unit, build, composed E2E, deploy dry run). Pin exactly. If you pick newer ones, upgrade Angular, Native Federation (same major as Angular) and Nx together via `nx migrate`, then rerun every check.

| Package | Version |
| --- | --- |
| Node | 22 (`>=22.12 <23`) |
| npm | 11 (npm 10.9 fails installing Vitest 4 optional peers: `Cannot read properties of null (reading 'edgesOut')`) |
| nx, @nx/* | 23.2.1 |
| @angular/core, common, compiler, forms, platform-browser, router, compiler-cli, language-service | 21.2.25 |
| @angular/cdk, @angular/aria | 21.2.14 |
| @angular/build, @angular/cli, @angular-devkit/*, @schematics/angular | 21.2.24 |
| @angular-architects/native-federation | 21.2.6 |
| es-module-shims | 2.8.4 |
| rxjs | 7.8.2 |
| tslib | 2.8.1 |
| typescript | 5.9.3 |
| @okta/okta-auth-js | 8.0.1 |
| msw | 2.15.0 |
| vitest / @vitest/coverage-v8 | 4.1.11 |
| @analogjs/vite-plugin-angular, @analogjs/vitest-angular | 2.6.3 |
| vite / vite-tsconfig-paths / jsdom | 8.0.9 / 5.1.4 / 26.1.0 |
| @playwright/test | 1.63.0 |
| eslint / angular-eslint / typescript-eslint | 9.39.2 / 21.4.0 / 8.46.2 |
| prettier | 3.8.1 |

## `.nvmrc`, `.npmrc`
```
22
```
```ini
# Exact versions only: `npm install x` writes "1.2.3", never "^1.2.3" (ADR-0009).
save-exact=true
engine-strict=true
# Internal registry for the design system, when published:
# @org:registry=https://npm.internal.example.com/
```

## `package.json` (scripts, engines, allowScripts)
```json
{
  "name": "@platform/source",
  "private": true,
  "engines": { "node": ">=22.12.0 <23", "npm": ">=11" },
  "scripts": {
    "start": "nx serve shell",
    "start:all": "nx run-many -t serve --projects=tag:type:app --parallel=50",
    "build:all": "nx run-many -t build",
    "lint:all": "nx run-many -t lint",
    "test:all": "nx run-many -t test",
    "e2e": "nx e2e shell-e2e",
    "g:mfe": "nx g @platform/tools:mfe",
    "check:shared-config": "node tools/scripts/check-shared-config.mjs",
    "check:no-mocks": "node tools/scripts/check-no-mocks-in-prod.mjs",
    "check:headers": "node tools/scripts/check-file-headers.mjs"
  },
  "msw": { "workerDirectory": ["libs/mocks/assets"] },
  "allowScripts": {
    "nx@23.2.1": true,
    "@swc/core@1.15.8": true,
    "msw@2.15.0": true,
    "esbuild@<installed version>": true,
    "lmdb@<installed version>": true,
    "msgpackr-extract@<installed version>": true,
    "@parcel/watcher@<installed version>": true
  }
}
```
npm 11 blocks install scripts that are not listed in `allowScripts`; packages then install but fail at runtime. After the first `npm install`, list the exact versions npm reports as blocked.

## `nx.json`
```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "defaultBase": "main",
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/eslint.config.mjs",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/vite.config.mts",
      "!{projectRoot}/.gitlab-ci.yml",
      "!{projectRoot}/README.md"
    ],
    "sharedGlobals": ["{workspaceRoot}/libs/mf-manifest/src/shared.config.js", "{workspaceRoot}/tsconfig.base.json", "{workspaceRoot}/.nvmrc"]
  },
  "targetDefaults": {
    "@angular/build:application": { "cache": true, "dependsOn": ["^build"], "inputs": ["production", "^production"] },
    "lint": { "cache": true, "inputs": ["default", "{workspaceRoot}/eslint.config.mjs"] },
    "test": { "cache": true, "inputs": ["default", "^production"] },
    "build": { "cache": true, "inputs": ["production", "^production"] }
  },
  "plugins": [
    { "plugin": "@nx/eslint/plugin", "options": { "targetName": "lint" } },
    { "plugin": "@nx/vitest", "options": { "testTargetName": "test" } }
  ],
  "generators": { "@nx/angular:component": { "style": "css", "changeDetection": "OnPush" } },
  "analytics": false
}
```
Key target defaults by **target name** (`build`, `lint`), not by executor, for anything continuous: a `serve` target keyed by executor got cached.

## `tsconfig.base.json` (paths)
```jsonc
{
  "compilerOptions": {
    "moduleResolution": "bundler", "module": "preserve", "target": "ES2022", "lib": ["ES2022", "dom", "dom.iterable"],
    "strict": true, "noImplicitOverride": true, "noImplicitReturns": true, "noPropertyAccessFromIndexSignature": true,
    "experimentalDecorators": true, "importHelpers": true, "isolatedModules": true, "skipLibCheck": true, "baseUrl": ".",
    "paths": {
      "@platform/contracts": ["libs/contracts/src/index.ts"],
      "@platform/mf-manifest": ["libs/mf-manifest/src/index.ts"],
      "@platform/auth": ["libs/auth/src/index.ts"],
      "@platform/auth-mock": ["libs/auth/mock/src/index.ts"],
      "@platform/entitlements": ["libs/entitlements/src/index.ts"],
      "@platform/utils": ["libs/utils/src/index.ts"],
      "@platform/mocks": ["libs/mocks/src/index.ts"],
      "@platform/legacy-bridge": ["libs/legacy-bridge/src/index.ts"],
      "@platform/tools": ["tools/generators/src/index.ts"]
    }
  }
}
```

## `eslint.config.mjs` (architecture rules as lint errors, ADR-0012)
```js
import nx from '@nx/eslint-plugin';

/**
 * Architecture rules (ADR-0002, ADR-0005, ADR-0012). Tags in each project.json:
 *   type:   app | layout | contracts | shared-lib | mocks | e2e | tooling
 *   family: host | capability | <your families, e.g. orders>    (apps and layout libs)
 *   kind:   host | domain | capability | hub
 *   scope:  shared                                              (libs every app may use)
 */
export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  { ignores: ['**/dist', '**/vite.config.*.timestamp*', 'libs/mocks/assets/**'] },
  {
    files: ['**/*.ts', '**/*.js', '**/*.mts', '**/*.mjs'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$', '^.*/tools/vitest/.*$'],
          depConstraints: [
            { sourceTag: 'type:contracts', onlyDependOnLibsWithTags: [], bannedExternalImports: ['@org/*', 'msw', 'msw/*', '@okta/*'] },
            { sourceTag: 'type:shared-lib', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib'], bannedExternalImports: ['msw', 'msw/*'] },
            { sourceTag: 'type:mocks', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib', 'type:mocks'] },
            { sourceTag: 'type:layout', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib'], bannedExternalImports: ['msw', 'msw/*'] },
            { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:contracts', 'type:shared-lib', 'type:layout', 'type:mocks'] },
            { sourceTag: 'family:host', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'family:capability', onlyDependOnLibsWithTags: ['scope:shared'] },
            { sourceTag: 'family:standalone', onlyDependOnLibsWithTags: ['scope:shared'] },
            // one line per family with a layout lib: an app may use only its OWN family's layout
            // { sourceTag: 'family:orders', onlyDependOnLibsWithTags: ['scope:shared', 'family:orders'] },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@platform/mocks', message: 'Import @platform/mocks only from src/start-mocks.ts or *.spec.ts (ADR-0005).' }],
          patterns: [{ group: ['msw', 'msw/*'], message: 'MSW is used only inside libs/mocks (ADR-0005).' }],
        },
      ],
    },
  },
  { files: ['**/start-mocks.ts', '**/*.spec.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['libs/mocks/**'], rules: { 'no-restricted-imports': 'off' } },
  // Build/test config files reach into tools/ and libs/mf-manifest by relative path on purpose.
  { files: ['**/vite.config.mts', '**/eslint.config.mjs', '**/federation.config.js'], rules: { '@nx/enforce-module-boundaries': 'off' } },
  { files: ['**/*.js', '**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
];
```

## `tools/eslint/angular.config.mjs`
```js
/** @file Shared ESLint rules for Angular projects: selector prefixes and mandatory OnPush (ADR-0012). */
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

/** `prefix`: the project's selector prefix, or an array when a lib exposes a second one (e.g. ['platform', 'has']). */
export function angularEslintConfig(prefix, extraRules = []) {
  return [
    ...baseConfig,
    ...nx.configs['flat/angular'],
    ...nx.configs['flat/angular-template'],
    {
      files: ['**/*.ts'],
      rules: {
        '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix, style: 'camelCase' }],
        '@angular-eslint/component-selector': ['error', { type: 'element', prefix, style: 'kebab-case' }],
        '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      },
    },
    ...extraRules,
  ];
}
```
Each project's `eslint.config.mjs`:
```js
/** @file ESLint configuration for <project> (shared Angular rules: tools/eslint; architecture rules: root eslint.config.mjs). */
import { angularEslintConfig } from '../../tools/eslint/angular.config.mjs';
export default angularEslintConfig('<prefix>');
```
Add `'no-console': 'error'` to `extraRules` if you want the logger rule enforced (allow it in `platform-log.ts` and `main.ts`).

## `tools/vitest/angular-vitest.config.mts` and `test-setup.ts`
```ts
/** @file Shared Vitest config factory for Angular projects; each vite.config.mts is `export default angularVitestConfig(__dirname)`. */
import { defineConfig, type UserConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import tsconfigPaths from 'vite-tsconfig-paths';
import { join, relative } from 'node:path';

const workspaceRoot = join(__dirname, '..', '..');

export function angularVitestConfig(projectDir: string, overrides: UserConfig['test'] = {}) {
  const projectRoot = relative(workspaceRoot, projectDir);
  return defineConfig({
    root: projectDir,
    cacheDir: join(workspaceRoot, 'node_modules/.vite', projectRoot),
    plugins: [angular({ tsconfig: join(projectDir, 'tsconfig.spec.json') }), tsconfigPaths({ root: workspaceRoot, projects: ['tsconfig.base.json'] })],
    test: {
      name: projectRoot,
      watch: false,
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.spec.ts'],
      setupFiles: [join(workspaceRoot, 'tools/vitest/test-setup.ts')],
      passWithNoTests: true,
      coverage: { provider: 'v8', reportsDirectory: join(workspaceRoot, 'coverage', projectRoot) },
      ...overrides,
    },
  });
}
```
```ts
// @file Zoneless Angular TestBed for every project.
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';
setupTestBed({ zoneless: true });
```
The mocks lib overrides `environment: 'node'` (jsdom lacks `TransformStream`). Vitest does not type-check: always run the build too.

## `apps/shell/project.json` (targets)
```jsonc
{
  "name": "shell",
  "projectType": "application",
  "prefix": "shell",
  "sourceRoot": "apps/shell/src",
  "tags": ["type:app", "family:host", "kind:host"],
  "targets": {
    "build": {
      "executor": "@angular-architects/native-federation:build",
      "outputs": ["{workspaceRoot}/dist/apps/shell", "{workspaceRoot}/dist/apps-mock/shell"],
      "options": {},
      "configurations": {
        "production": { "target": "shell:esbuild:production" },
        "mock": { "target": "shell:esbuild:mock" },
        "development": { "target": "shell:esbuild:development", "dev": true }
      },
      "defaultConfiguration": "production"
    },
    "esbuild": {
      "executor": "@angular/build:application",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/apps/shell",
        "index": "apps/shell/src/index.html",
        "browser": "apps/shell/src/main.ts",
        "polyfills": ["es-module-shims"],
        "tsConfig": "apps/shell/tsconfig.app.json",
        "assets": [{ "glob": "**/*", "input": "apps/shell/public" }],
        "styles": ["node_modules/<design-tokens>/tokens.css", "node_modules/<design-tokens>/reset.css", "apps/shell/src/styles.css"]
      },
      "configurations": {
        "production": {
          "budgets": [
            { "type": "initial", "maximumWarning": "500kb", "maximumError": "800kb" },
            { "type": "anyComponentStyle", "maximumWarning": "4kb", "maximumError": "8kb" }
          ],
          "outputHashing": "all",
          "fileReplacements": [
            { "replace": "apps/shell/src/environments/environment.ts", "with": "apps/shell/src/environments/environment.prod.ts" },
            { "replace": "apps/shell/src/start-mocks.ts", "with": "apps/shell/src/start-mocks.prod.ts" }
          ]
        },
        "mock": {
          "outputPath": "dist/apps-mock/shell",
          "outputHashing": "all",
          "assets": [
            { "glob": "**/*", "input": "apps/shell/public" },
            { "glob": "mockServiceWorker.js", "input": "libs/mocks/assets", "output": "/" }
          ],
          "fileReplacements": [{ "replace": "apps/shell/src/environments/environment.ts", "with": "apps/shell/src/environments/environment.mock.ts" }]
        },
        "development": {
          "optimization": false, "extractLicenses": false, "sourceMap": true,
          "assets": [
            { "glob": "**/*", "input": "apps/shell/public" },
            { "glob": "mockServiceWorker.js", "input": "libs/mocks/assets", "output": "/" },
            { "glob": "mf-manifest.json", "input": "libs/mf-manifest/manifests/local", "output": "/" },
            { "glob": "app-config.json", "input": "apps/shell/config/local", "output": "/" }
          ]
        }
      },
      "defaultConfiguration": "production"
    },
    "serve": {
      "executor": "@angular-architects/native-federation:build",
      "continuous": true,
      "options": { "target": "shell:serve-original:development", "rebuildDelay": 500, "dev": true, "cacheExternalArtifacts": false, "port": 0 }
    },
    "serve-original": {
      "executor": "@angular/build:dev-server",
      "continuous": true,
      "options": { "port": 4200 },
      "configurations": { "production": { "buildTarget": "shell:esbuild:production" }, "development": { "buildTarget": "shell:esbuild:development" } },
      "defaultConfiguration": "development"
    }
  }
}
```
Production uses `dist/apps/<app>`, mock uses `dist/apps-mock/<app>`: with one output path, the mock build once overwrote the production build.

## Lib `project.json` example
```json
{ "name": "entitlements", "sourceRoot": "libs/entitlements/src", "projectType": "library", "tags": ["type:shared-lib", "scope:shared"], "targets": {} }
```

## `.gitlab/CODEOWNERS`
```
[Platform]
/libs/                         @<group>/platform-team
/apps/shell/                   @<group>/platform-team
/tools/                        @<group>/platform-team
/ci/                           @<group>/platform-team
/libs/contracts/               @<group>/platform-team
# the generator appends one line per app:
```

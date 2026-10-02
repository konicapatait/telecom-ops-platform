import { Tree, readJson, readProjectConfiguration } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { mfeGenerator } from './generator';

function seed(tree: Tree): void {
  tree.write(
    'libs/contracts/src/lib/remotes.ts',
    `export const REMOTE_NAMES = [\n  // <generator:remote-names>\n] as const;\n`,
  );
  tree.write(
    'libs/mf-manifest/manifests/local/mf-manifest.json',
    JSON.stringify({ 'mfe-existing': 'http://localhost:4205/remoteEntry.json' }),
  );
  tree.write(
    'apps/shell/src/app/routing/remote-registry.ts',
    `export const SHELL_REMOTE_ROUTES = [\n  // <generator:shell-routes>\n];\n`,
  );
  tree.write('.gitlab/CODEOWNERS', '[Apps]\n');
  tree.write(
    'apps/mfe-case-management/src/app/case-management.tabs.ts',
    `export const CASE_MANAGEMENT_TABS = [\n  // <generator:case-tabs>\n];\n`,
  );
}

describe('mfe generator', () => {
  let tree: Tree;
  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    seed(tree);
  });

  it('creates a case-family domain on the shared case layout and wires every registry', async () => {
    await mfeGenerator(tree, {
      name: 'billing-disputes',
      kind: 'domain',
      family: 'case',
      caseDomain: 'BILLING_DISPUTE',
      route: 'disputes',
      skipFormat: true,
    });

    const project = readProjectConfiguration(tree, 'mfe-billing-disputes');
    expect(project.tags).toEqual(['type:app', 'family:case', 'kind:domain']);
    expect(project.targets?.['serve-original'].options.port).toBe(4206);
    expect(project.targets?.['esbuild'].configurations?.['mock'].outputPath).toBe(
      'dist/apps-mock/mfe-billing-disputes',
    );

    const fed = tree.read('apps/mfe-billing-disputes/federation.config.js', 'utf-8');
    expect(fed).toContain(`'./Routes'`);
    expect(fed).toContain(`'./BillingDisputesOverview'`);
    const config = tree.read('apps/mfe-billing-disputes/src/app/billing-disputes.config.ts', 'utf-8');
    expect(config).toContain(`domain: 'BILLING_DISPUTE'`);
    expect(config).toContain('BILLING_DISPUTES_DOMAIN_CONFIG');
    expect(tree.read('apps/mfe-billing-disputes/src/app/billing-disputes.routes.ts', 'utf-8')).toContain(
      'CaseQueueComponent',
    );
    expect(tree.exists('apps/mfe-billing-disputes/src/app/billing-disputes-home.component.ts')).toBe(false);
    expect(tree.exists('apps/mfe-billing-disputes/.gitlab-ci.yml')).toBe(true);

    expect(tree.read('libs/contracts/src/lib/remotes.ts', 'utf-8')).toContain(`'mfe-billing-disputes',`);
    expect(readJson(tree, 'libs/mf-manifest/manifests/local/mf-manifest.json')['mfe-billing-disputes']).toBe(
      'http://localhost:4206/remoteEntry.json',
    );
    // Case domains are tabs of the case-management hub, not shell sections (ADR-0022).
    expect(tree.read('apps/shell/src/app/routing/remote-registry.ts', 'utf-8')).not.toContain('disputes');
    expect(tree.read('apps/mfe-case-management/src/app/case-management.tabs.ts', 'utf-8')).toContain(
      `remote: 'mfe-billing-disputes', domains: [{ domain: 'BILLING_DISPUTE', subPath: '' }], entitlement: 'disputes:view'`,
    );
    expect(tree.read('.gitlab/CODEOWNERS', 'utf-8')).toContain('/apps/mfe-billing-disputes/');
  });

  it('creates a hub as a shell section that opens cases', async () => {
    await mfeGenerator(tree, { name: 'service-desk', kind: 'hub', route: 'service-desk', skipFormat: true });
    expect(readProjectConfiguration(tree, 'mfe-service-desk').tags).toEqual(['type:app', 'family:case', 'kind:hub']);
    expect(tree.read('apps/shell/src/app/routing/remote-registry.ts', 'utf-8')).toContain(`path: 'service-desk'`);
    expect(tree.read('apps/shell/src/app/routing/remote-registry.ts', 'utf-8')).toContain('opensCases: true');
  });

  it('scaffolds a 360 section on the shared 360 layout', async () => {
    await mfeGenerator(tree, {
      name: 'subscriber-view',
      kind: 'domain',
      family: '360',
      route: 'subscribers',
      skipFormat: true,
    });
    expect(readProjectConfiguration(tree, 'mfe-subscriber-view').tags).toEqual([
      'type:app',
      'family:360',
      'kind:domain',
    ]);
    expect(tree.read('apps/mfe-subscriber-view/src/app/subscriber-view-profile.component.ts', 'utf-8')).toContain(
      'Layout360Component',
    );
    expect(tree.exists('apps/mfe-subscriber-view/src/app/subscriber-view.sections.ts')).toBe(true);
    expect(tree.read('apps/shell/src/app/routing/remote-registry.ts', 'utf-8')).toContain(`path: 'subscribers'`);
  });

  it('scaffolds a placeholder section for non-case families', async () => {
    await mfeGenerator(tree, { name: 'reporting', kind: 'domain', family: 'reporting', skipFormat: true });
    expect(tree.exists('apps/mfe-reporting/src/app/reporting-home.component.ts')).toBe(true);
    expect(tree.exists('apps/mfe-reporting/src/app/reporting.config.ts')).toBe(false);
  });

  it('requires --caseDomain for case-family domains', async () => {
    await expect(mfeGenerator(tree, { name: 'x', kind: 'domain', family: 'case', skipFormat: true })).rejects.toThrow(
      /caseDomain/,
    );
  });

  it('creates a capability remote without a shell route and with a mock-only fixture token', async () => {
    await mfeGenerator(tree, {
      name: 'usage-billing',
      kind: 'capability',
      exposedName: 'UsageBilling',
      skipFormat: true,
    });

    expect(readProjectConfiguration(tree, 'mfe-cap-usage-billing').tags).toContain('family:capability');
    expect(tree.read('apps/mfe-cap-usage-billing/federation.config.js', 'utf-8')).toContain(`'./UsageBilling'`);
    expect(tree.read('apps/shell/src/app/routing/remote-registry.ts', 'utf-8')).not.toContain('usage-billing');
    expect(tree.read('apps/mfe-cap-usage-billing/src/start-mocks.ts', 'utf-8')).toContain('DEV_FIXTURE_CASES');
    expect(tree.read('apps/mfe-cap-usage-billing/src/start-mocks.prod.ts', 'utf-8')).not.toContain('@platform/mocks');
  });

  it('refuses to overwrite an existing app', async () => {
    await mfeGenerator(tree, { name: 'insights', kind: 'domain', family: 'reporting', skipFormat: true });
    await expect(
      mfeGenerator(tree, { name: 'insights', kind: 'domain', family: 'reporting', skipFormat: true }),
    ).rejects.toThrow(/already exists/);
  });
});

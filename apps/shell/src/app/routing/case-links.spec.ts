import { caseUrl, profileUrl } from './case-links';
import type { ShellRemoteRoute } from './remote-registry';

const REGISTRY = [
  { remote: 'mfe-x', path: 'reports', label: 'Reports', group: 'Insights' },
  {
    remote: 'mfe-case-management',
    path: 'case-management',
    label: 'Case management',
    group: 'Case management',
    opensCases: true,
  },
  {
    remote: 'mfe-subscriber-view',
    path: 'subscribers',
    label: 'Subscriber 360',
    group: 'Customer & partner 360',
    opensProfile: 'SUBSCRIBER',
  },
] as unknown as ShellRemoteRoute[];

describe('caseUrl', () => {
  it('sends every case to the section that opens cases', () => {
    expect(caseUrl(REGISTRY, 'FRD-1')).toBe('/case-management/cases/FRD-1');
  });
  it('returns null when that section is not deployed', () => {
    expect(caseUrl(REGISTRY, 'FRD-1', () => false)).toBeNull();
  });
});

describe('profileUrl', () => {
  it('routes a subscriber to the section that shows subscriber profiles', () => {
    expect(profileUrl(REGISTRY, 'SUBSCRIBER', 'ACC-1')).toBe('/subscribers/ACC-1');
  });
  it('returns null when no section shows that kind', () => {
    expect(profileUrl(REGISTRY, 'PARTNER', 'DLR-1')).toBeNull();
  });
});

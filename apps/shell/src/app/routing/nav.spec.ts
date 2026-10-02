import { visibleNavItems } from './nav';
import type { ShellRemoteRoute } from './remote-registry';

const REGISTRY = [
  { remote: 'mfe-a', path: 'a', label: 'A', group: 'Case management', entitlement: 'a:view' },
  { remote: 'mfe-b', path: 'b', label: 'B', group: 'Insights' },
] as unknown as ShellRemoteRoute[];

describe('visibleNavItems', () => {
  it('hides sections whose remote is not deployed', () => {
    const items = visibleNavItems(
      REGISTRY,
      (r) => r === 'mfe-b',
      () => true,
    );
    expect(items.map((i) => i.label)).toEqual(['Home', 'B']);
  });

  it('hides sections the user is not entitled to', () => {
    const items = visibleNavItems(
      REGISTRY,
      () => true,
      (e) => e === undefined,
    );
    expect(items.map((i) => i.label)).toEqual(['Home', 'B']);
  });

  it('always shows Home', () => {
    expect(
      visibleNavItems(
        [],
        () => false,
        () => false,
      ),
    ).toEqual([{ label: 'Home', path: '/' }]);
  });
});

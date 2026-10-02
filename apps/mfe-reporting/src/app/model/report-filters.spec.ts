import { groupsParam, parseGroups, presetOf, presetRange } from './report-filters';
import { REPORT_GROUPS } from './report-groups';

describe('report filters', () => {
  const today = new Date('2026-10-02T15:00:00Z');

  it('builds inclusive preset ranges ending today', () => {
    expect(presetRange('last-4', today)).toEqual({ from: '2026-09-05', to: '2026-10-02' });
    expect(presetRange('last-13', today)).toEqual({ from: '2026-07-04', to: '2026-10-02' });
  });

  it('recognises a preset range and treats anything else as custom', () => {
    expect(presetOf('2026-09-05', '2026-10-02', today)).toBe('last-4');
    expect(presetOf('2026-07-01', '2026-09-30', today)).toBe('custom');
  });

  it('round-trips the groups query param', () => {
    expect(parseGroups(undefined)).toHaveLength(REPORT_GROUPS.length);
    expect(parseGroups('fraud,porting,bogus').map((g) => g.id)).toEqual(['fraud', 'porting']);
    expect(parseGroups('none')).toEqual([]);
    expect(groupsParam(REPORT_GROUPS)).toBeNull();
    expect(groupsParam([])).toBe('none');
    expect(groupsParam([REPORT_GROUPS[0]])).toBe('fraud');
  });
});

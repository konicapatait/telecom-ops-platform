import { CASES, HERO_CASES, generateCases } from './cases';

describe('case fixtures', () => {
  it('is deterministic for a seed', () => {
    expect(generateCases({ seed: 42, count: 5 })).toEqual(generateCases({ seed: 42, count: 5 }));
  });

  it('keeps hero cases first and ids unique', () => {
    expect(CASES.slice(0, HERO_CASES.length)).toEqual(HERO_CASES);
    expect(new Set(CASES.map((c) => c.caseId)).size).toBe(CASES.length);
  });

  it('prefixes every case type with its domain', () => {
    for (const c of CASES) expect(c.caseType.startsWith(c.domain + '_')).toBe(true);
  });
});

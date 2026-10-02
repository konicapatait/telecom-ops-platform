import { niceMax } from './chart-size';

describe('niceMax', () => {
  it.each([
    [273, 300],
    [96, 100],
    [410, 500],
    [1.2, 1.5],
    [0, 1],
  ])('%d → %d', (value, expected) => expect(niceMax(value)).toBe(expected));
});

import { formatCurrency, formatDuration, formatMsisdn } from './formatters';

describe('formatters', () => {
  it('formats North American MSISDNs', () => {
    expect(formatMsisdn('+13035550142')).toBe('+1 303 555 0142');
    expect(formatMsisdn('+1 303 555 0142')).toBe('+1 303 555 0142');
  });

  it('leaves unknown MSISDN shapes unchanged', () => {
    expect(formatMsisdn('+44 20 7946 0000')).toBe('+44 20 7946 0000');
  });

  it('formats currency and durations', () => {
    expect(formatCurrency(87.4)).toBe('$87.40');
    expect(formatDuration(2460)).toBe('41m 0s');
    expect(formatDuration(3720)).toBe('1h 2m');
  });
});

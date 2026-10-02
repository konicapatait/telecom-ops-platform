/** '+13035550142' or '+1 303 555 0142' -> '+1 303 555 0142'. Unknown shapes are returned unchanged. */
export function formatMsisdn(msisdn: string): string {
  const digits = msisdn.replace(/[^\d]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return msisdn;
}

export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** 2460 -> '41m 0s' */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`;
}

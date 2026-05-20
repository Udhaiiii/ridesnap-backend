import { describe, expect, it } from 'vitest';
import { formatInr, payLabel, pkgLabel } from '@/shared/lib/format';

describe('format', () => {
  it('formats INR', () => {
    expect(formatInr(1500)).toBe('₹1,500');
  });

  it('labels packages', () => {
    expect(pkgLabel('digital')).toBe('Digital');
    expect(pkgLabel('unknown')).toBe('unknown');
  });

  it('labels payment modes', () => {
    expect(payLabel('cash')).toContain('Cash');
    expect(payLabel('upi')).toContain('UPI');
  });
});

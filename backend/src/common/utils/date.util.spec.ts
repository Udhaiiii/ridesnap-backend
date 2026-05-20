import { todayLocal, parseWristbandNumber } from './date.util';

describe('date.util', () => {
  it('todayLocal returns YYYY-MM-DD', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('parseWristbandNumber extracts trailing number', () => {
    expect(parseWristbandNumber('WB-0042')).toBe(42);
    expect(parseWristbandNumber('WB-TEST')).toBe(0);
  });
});

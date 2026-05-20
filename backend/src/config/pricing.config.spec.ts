import { ConfigService } from '@nestjs/config';
import { getPrices, isValidOrderType } from './pricing.config';

describe('pricing.config', () => {
  const config = {
    get: (key: string, def?: string) => {
      const map: Record<string, string> = {
        PRICE_DIGITAL: '150',
        PRICE_PRINT: '250',
        PRICE_FRAME: '350',
        PRICE_COMBO: '499',
      };
      return map[key] ?? def;
    },
  } as ConfigService;

  it('loads prices from env', () => {
    const prices = getPrices(config);
    expect(prices.digital).toBe(150);
    expect(prices.combo).toBe(499);
  });

  it('validates order types', () => {
    const prices = getPrices(config);
    expect(isValidOrderType('digital', prices)).toBe(true);
    expect(isValidOrderType('invalid', prices)).toBe(false);
  });
});

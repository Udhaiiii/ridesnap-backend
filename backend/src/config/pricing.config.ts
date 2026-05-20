import { ConfigService } from '@nestjs/config';

export type OrderType = 'digital' | 'print' | 'frame' | 'combo';

export function getPrices(config: ConfigService): Record<OrderType, number> {
  return {
    digital: parseInt(config.get('PRICE_DIGITAL', '150'), 10),
    print: parseInt(config.get('PRICE_PRINT', '250'), 10),
    frame: parseInt(config.get('PRICE_FRAME', '350'), 10),
    combo: parseInt(config.get('PRICE_COMBO', '499'), 10),
  };
}

export function isValidOrderType(type: string, prices: Record<string, number>): type is OrderType {
  return type in prices;
}

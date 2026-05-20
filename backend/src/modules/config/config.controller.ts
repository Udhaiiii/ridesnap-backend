import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getPrices } from '../../config/pricing.config';

@Controller('api/config')
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getConfig() {
    const prices = getPrices(this.config);
    return {
      success: true,
      park_name: this.config.get('PARK_NAME', 'RideSnap Park'),
      prices,
      payment: {
        upi_id: this.config.get('UPI_ID', ''),
        upi_name: this.config.get('UPI_NAME', 'Park'),
      },
    };
  }
}

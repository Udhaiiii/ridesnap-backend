import { Controller, Get, Param } from '@nestjs/common';
import { ReceiptService } from './receipt.service';

@Controller('api/receipt')
export class ReceiptController {
  constructor(private readonly service: ReceiptService) {}

  @Get(':order_id')
  get(@Param('order_id') orderId: string) {
    return this.service.getReceipt(orderId);
  }
}

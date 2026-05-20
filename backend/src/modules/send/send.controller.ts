import { Body, Controller, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { SendService } from './send.service';

class OrderEmailDto {
  @IsString() order_id!: string;
  @IsString() email!: string;
}

class OrderPhoneDto {
  @IsString() order_id!: string;
  @IsString() phone!: string;
}

class WhatsappDto {
  @IsString() order_id!: string;
  @IsOptional() @IsString() phone?: string;
}

@Controller('api/send')
export class SendController {
  constructor(private readonly service: SendService) {}

  @Post('email')
  email(@Body() dto: OrderEmailDto) {
    return this.service.sendEmail(dto.order_id, dto.email);
  }

  @Post('sms')
  sms(@Body() dto: OrderPhoneDto) {
    return this.service.sendSms(dto.order_id, dto.phone);
  }

  @Post('whatsapp-link')
  whatsapp(@Body() dto: WhatsappDto) {
    return this.service.whatsappLink(dto.order_id, dto.phone);
  }
}

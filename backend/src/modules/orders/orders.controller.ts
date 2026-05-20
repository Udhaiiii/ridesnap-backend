import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsString() visit_id!: string;
  @IsString() photo_id!: string;
  @IsString() order_type!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() payment_mode?: string;
  @IsOptional() @IsString() payment_splits?: string;
}

class BulkOrderDto {
  @IsString() visit_id!: string;
  @IsArray() photo_ids!: string[];
  @IsString() order_type!: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() payment_mode?: string;
  @IsOptional() @IsString() payment_splits?: string;
}

@ApiTags('orders')
@Controller('api/orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.service.create(dto);
  }

  @Post('bulk')
  bulk(@Body() dto: BulkOrderDto) {
    return this.service.bulkCreate(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

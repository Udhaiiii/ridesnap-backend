import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { IsString } from 'class-validator';
import { PrintQueueService } from './print-queue.service';

class StatusDto {
  @IsString() status!: string;
}

@Controller('api/print-queue')
export class PrintQueueController {
  constructor(private readonly service: PrintQueueService) {}

  @Get()
  list(@Query('status') status?: string) {
    return this.service.list(status);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: StatusDto) {
    return this.service.updateStatus(id, dto.status);
  }
}

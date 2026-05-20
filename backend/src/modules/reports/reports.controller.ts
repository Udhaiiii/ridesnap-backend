import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('daily')
  daily(@Query('date') date?: string) {
    return this.service.daily(date);
  }
}

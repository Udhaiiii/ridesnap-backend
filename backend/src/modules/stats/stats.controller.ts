import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { StatsService } from './stats.service';

@ApiTags('stats')
@Controller('api/stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get()
  @ApiOperation({ summary: 'Dashboard stats (today)' })
  getStats() {
    return this.service.getStats();
  }
}

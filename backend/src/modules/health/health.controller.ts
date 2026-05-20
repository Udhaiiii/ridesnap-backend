import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check with database probe' })
  async health() {
    let db = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = 'error';
    }
    return {
      success: db === 'ok',
      status: 'RideSnap API running',
      checks: { database: db },
      time: new Date().toISOString(),
    };
  }
}

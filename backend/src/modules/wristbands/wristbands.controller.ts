import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { WristbandsService } from './wristbands.service';

class GenerateDto {
  @IsInt()
  @Min(1)
  @Max(2000)
  quantity!: number;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsString()
  label?: string;
}

@Controller('api/wristbands')
export class WristbandsController {
  constructor(private readonly service: WristbandsService) {}

  @Get('today-status')
  todayStatus() {
    return this.service.todayStatus();
  }

  @Post('generate')
  generate(@Body() dto: GenerateDto) {
    return this.service.generate(dto.quantity, dto.prefix, dto.label);
  }

  @Get('validate/:id')
  validate(@Param('id') id: string) {
    return this.service.validate(id);
  }

  @Get('list')
  list(@Query('date') date?: string, @Query('status') status?: string) {
    return this.service.list(date, status);
  }

  @Get('batches')
  batches() {
    return this.service.batches();
  }
}

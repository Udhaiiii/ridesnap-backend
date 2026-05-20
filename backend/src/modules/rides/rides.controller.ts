import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { RidesService } from './rides.service';

class RideDto {
  @IsString() id!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() emoji?: string;
}

class UpdateRideDto {
  @IsString() name!: string;
  @IsOptional() @IsString() emoji?: string;
}

@Controller('api/rides')
export class RidesController {
  constructor(private readonly service: RidesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() dto: RideDto) {
    return this.service.create(dto.id, dto.name, dto.emoji);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRideDto) {
    return this.service.update(id, dto.name, dto.emoji);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

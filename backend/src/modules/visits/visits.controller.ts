import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { VisitsService } from './visits.service';

class CreateVisitDto {
  @IsOptional() @IsString() guest_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

class DetailsDto {
  @IsOptional() @IsString() guest_name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() email?: string;
}

@Controller('api/visits')
export class VisitsController {
  constructor(private readonly service: VisitsService) {}

  @Post()
  create(@Body() dto: CreateVisitDto) {
    return this.service.create(dto.guest_name, dto.phone, dto.email);
  }

  @Get()
  list() {
    return this.service.listToday();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/details')
  updateDetails(@Param('id') id: string, @Body() dto: DetailsDto) {
    return this.service.updateDetails(id, dto.guest_name, dto.phone, dto.email);
  }
}

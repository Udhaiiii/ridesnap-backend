import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsOptional, IsString } from 'class-validator';
import { PhotosService } from './photos.service';

class PresignDto {
  @IsString() visit_id!: string;
  @IsOptional() @IsString() ride_id?: string;
}

@Controller('api/photos')
export class PhotosController {
  constructor(private readonly service: PhotosService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('photo'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('visit_id') visitId: string,
    @Body('ride_id') rideId?: string,
    @Body('ride_name') rideName?: string,
  ) {
    return this.service.upload(file, visitId, rideId, rideName);
  }

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.service.presign(dto.visit_id, dto.ride_id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}

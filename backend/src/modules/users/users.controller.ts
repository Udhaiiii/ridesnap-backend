import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { Roles } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.service';
import { UsersService } from './users.service';

class CreateUserDto {
  @IsString() username!: string;
  @IsString() password!: string;
  @IsString() role!: string;
  @IsOptional() @IsString() name?: string;
}

class UpdateUserDto {
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsInt() active?: number;
}

@ApiTags('users')
@ApiSecurity('session')
@Controller('api/users')
@Roles('admin')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto.username, dto.password, dto.role, dto.name);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) {
    return this.service.remove(id, req.user.id);
  }
}

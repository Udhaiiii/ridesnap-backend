import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './auth.guard';

class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username!: string;

  @ApiProperty({ example: 'admin@123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff login — returns session token' })
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto.username, dto.password);
    return { success: true, ...result };
  }

  @Public()
  @Post('logout')
  async logout(@Headers('x-auth-token') token?: string, @Body('token') bodyToken?: string) {
    await this.auth.logout(token ?? bodyToken);
    return { success: true, message: 'Logged out' };
  }

  @Public()
  @Get('verify')
  async verify(@Headers('x-auth-token') token?: string) {
    const user = await this.auth.verifyToken(token);
    if (!user) return { success: false, error: 'Invalid or expired session' };
    return {
      success: true,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
    };
  }
}

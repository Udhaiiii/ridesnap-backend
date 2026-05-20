import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { makeToken } from '../../common/utils/ids.util';

export interface AuthUser {
  id: string;
  name: string | null;
  username: string;
  role: string;
  token?: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { username: username.trim(), active: true },
    });
    if (!user) throw new UnauthorizedException('Invalid username or password');

    const valid =
      (await bcrypt.compare(password, user.password).catch(() => false)) ||
      user.password === password;
    if (!valid) throw new UnauthorizedException('Invalid username or password');

    const token = makeToken();
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        token,
        userId: user.id,
        role: user.role,
        expiresAt,
      },
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role },
      expires_at: expiresAt.toISOString(),
    };
  }

  async logout(token?: string) {
    if (token) {
      await this.prisma.session.deleteMany({ where: { token } });
    }
    return { message: 'Logged out' };
  }

  async verifyToken(token?: string): Promise<AuthUser | null> {
    if (!token) return null;
    const session = await this.prisma.session.findUnique({ where: { token } });
    if (!session || session.expiresAt < new Date()) {
      if (session) await this.prisma.session.delete({ where: { token } });
      return null;
    }
    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user?.active) return null;
    return {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      token,
    };
  }

  async cleanExpiredSessions() {
    await this.prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}

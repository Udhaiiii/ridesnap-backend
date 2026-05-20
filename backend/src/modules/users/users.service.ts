import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { genId } from '../../common/utils/ids.util';

const VALID_ROLES = ['admin', 'photographer', 'counter', 'print'];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        active: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, users };
  }

  async create(username: string, password: string, role: string, name?: string) {
    if (!VALID_ROLES.includes(role)) {
      throw new BadRequestException({
        success: false,
        error: `Role must be: ${VALID_ROLES.join(', ')}`,
      });
    }
    const existing = await this.prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing) {
      throw new ConflictException({ success: false, error: 'Username already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const id = genId('USR', 6);
    await this.prisma.user.create({
      data: {
        id,
        username: username.trim(),
        password: hash,
        role,
        name: name ?? username,
      },
    });
    return {
      success: true,
      user: { id, username: username.trim(), role, name: name ?? username },
    };
  }

  async update(
    id: string,
    data: { password?: string; role?: string; name?: string; active?: number },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ success: false, error: 'User not found' });

    const update: Record<string, unknown> = {};
    if (data.password) update.password = await bcrypt.hash(data.password, 10);
    if (data.role) update.role = data.role;
    if (data.name) update.name = data.name;
    if (data.active !== undefined) update.active = data.active === 1;

    await this.prisma.user.update({ where: { id }, data: update });

    if (data.active === 0) {
      await this.prisma.session.deleteMany({ where: { userId: id } });
    }

    const updated = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true, name: true, active: true },
    });
    return { success: true, user: updated };
  }

  async remove(id: string, callerId: string) {
    if (callerId === id) {
      throw new BadRequestException({ success: false, error: 'Cannot delete your own account' });
    }
    await this.prisma.session.deleteMany({ where: { userId: id } });
    await this.prisma.user.delete({ where: { id } });
    return { success: true, message: 'User deleted' };
  }
}

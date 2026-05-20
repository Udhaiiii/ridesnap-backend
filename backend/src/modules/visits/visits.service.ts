import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { genVisitId } from '../../common/utils/ids.util';
import { startOfTodayLocal, endOfTodayLocal, todayLocal } from '../../common/utils/date.util';

@Injectable()
export class VisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(guestName?: string, phone?: string, email?: string) {
    const id = genVisitId();
    const visit = await this.prisma.visit.create({
      data: {
        id,
        guestName: guestName ?? 'Guest',
        phone: phone ?? null,
        email: email ?? null,
      },
    });
    return { success: true, visit };
  }

  async findById(id: string) {
    const wbId = id.toUpperCase().trim();
    const wb = await this.prisma.wristband.findUnique({ where: { id: wbId } });
    if (!wb) {
      throw new ForbiddenException({
        success: false,
        valid: false,
        error: 'Invalid wristband ID. Not registered in system.',
      });
    }

    let visit = await this.prisma.visit.findUnique({ where: { id: wbId } });
    const today = todayLocal();

    if (visit && wb.batchDate === today) {
      const visitDate = visit.entryTime.toISOString().slice(0, 10);
      if (visitDate !== today) {
        visit = await this.prisma.visit.update({
          where: { id: wbId },
          data: {
            guestName: 'Guest',
            phone: null,
            email: null,
            entryTime: new Date(),
          },
        });
      }
    }

    const photos = await this.prisma.photo.findMany({
      where: {
        visitId: wbId,
        capturedAt: { gte: startOfTodayLocal(), lte: endOfTodayLocal() },
      },
      orderBy: { capturedAt: 'desc' },
    });

    return {
      success: true,
      visit: visit ?? { id: wbId },
      photos,
      wristband: wb,
    };
  }

  async listToday() {
    const start = startOfTodayLocal();
    const end = endOfTodayLocal();
    const visits = await this.prisma.visit.findMany({
      where: { entryTime: { gte: start, lte: end } },
      orderBy: { entryTime: 'desc' },
      include: { _count: { select: { photos: true } } },
    });
    return {
      success: true,
      visits: visits.map((v) => ({
        ...v,
        photo_count: v._count.photos,
      })),
    };
  }

  async updateDetails(id: string, guestName?: string, phone?: string, email?: string) {
    const wbId = id.toUpperCase().trim();
    const existing = await this.prisma.visit.findUnique({ where: { id: wbId } });
    if (existing) {
      const visit = await this.prisma.visit.update({
        where: { id: wbId },
        data: {
          guestName: guestName ?? existing.guestName,
          phone: phone ?? existing.phone,
          email: email ?? existing.email,
        },
      });
      return { success: true, visit };
    }
    const visit = await this.prisma.visit.create({
      data: {
        id: wbId,
        guestName: guestName ?? 'Guest',
        phone: phone ?? null,
        email: email ?? null,
      },
    });
    return { success: true, visit };
  }
}

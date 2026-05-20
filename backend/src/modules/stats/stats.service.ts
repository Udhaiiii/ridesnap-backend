import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfTodayLocal, endOfTodayLocal, todayLocal } from '../../common/utils/date.util';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const today = { gte: startOfTodayLocal(), lte: endOfTodayLocal() };

    const guestsToday = await this.prisma.visit.count({
      where: { entryTime: today },
    });
    const photosToday = await this.prisma.photo.count({
      where: { capturedAt: today },
    });
    const ordersAgg = await this.prisma.order.aggregate({
      where: { createdAt: today, paymentStatus: 'paid' },
      _count: true,
      _sum: { price: true },
    });
    const pendingPrints = await this.prisma.printQueueItem.count({
      where: { status: { in: ['queued', 'printing'] } },
    });
    const wbStats = await this.prisma.wristband.aggregate({
      where: { batchDate: todayLocal() },
      _count: true,
    });
    const wbActive = await this.prisma.wristband.count({
      where: { batchDate: todayLocal(), status: 'active' },
    });
    const wbInactive = await this.prisma.wristband.count({
      where: { batchDate: todayLocal(), status: 'inactive' },
    });

    return {
      success: true,
      stats: {
        guests_today: guestsToday,
        photos_today: photosToday,
        orders_today: ordersAgg._count,
        revenue_today: ordersAgg._sum.price ?? 0,
        pending_prints: pendingPrints,
        wristbands: {
          total: wbStats._count,
          active: wbActive,
          inactive: wbInactive,
        },
      },
    };
  }
}

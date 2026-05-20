import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfTodayLocal, endOfTodayLocal } from '../../common/utils/date.util';

@Injectable()
export class PrintQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async list(status?: string) {
    const todayFilter = {
      queuedAt: { gte: startOfTodayLocal(), lte: endOfTodayLocal() },
    };

    let statusFilter: { status?: { in: string[] } } = {};
    if (status && status !== 'all') {
      const statuses = status.split(',').map((s) => s.trim());
      statusFilter = { status: { in: statuses } };
    }

    const items = await this.prisma.printQueueItem.findMany({
      where: { ...todayFilter, ...statusFilter },
      orderBy: { queuedAt: 'asc' },
      include: {
        photo: { select: { s3Url: true, rideName: true } },
        order: { select: { orderType: true, price: true } },
      },
    });

    const queue = items.map((pq) => ({
      ...pq,
      s3_url: pq.photo.s3Url,
      ride_name: pq.photo.rideName,
      order_type: pq.order.orderType,
      price: pq.order.price,
    }));

    const counts = await this.prisma.printQueueItem.groupBy({
      by: ['status'],
      where: todayFilter,
      _count: true,
    });

    const badges: Record<string, number> = {
      queued: 0,
      printing: 0,
      done: 0,
      collected: 0,
      all: 0,
    };
    for (const c of counts) {
      badges[c.status] = c._count;
      badges.all += c._count;
    }

    return { success: true, queue, badges };
  }

  async updateStatus(id: string, status: string) {
    const allowed = ['printing', 'done', 'collected'];
    if (!allowed.includes(status)) {
      throw new BadRequestException({
        success: false,
        error: `Status must be: ${allowed.join(', ')}`,
      });
    }

    const data: { status: string; printedAt?: Date; collectedAt?: Date } = { status };
    if (status === 'done') data.printedAt = new Date();
    if (status === 'collected') data.collectedAt = new Date();

    await this.prisma.printQueueItem.update({ where: { id }, data });

    if (status === 'done') {
      const pq = await this.prisma.printQueueItem.findUnique({ where: { id } });
      if (pq) {
        await this.prisma.order.update({
          where: { id: pq.orderId },
          data: { deliveryStatus: 'printed' },
        });
      }
    }

    return { success: true, message: `Print status updated to: ${status}` };
  }
}

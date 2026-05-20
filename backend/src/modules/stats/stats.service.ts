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
    const ordersToday = await this.prisma.order.findMany({
      where: { createdAt: today, paymentStatus: 'paid' },
      include: {
        visit: { select: { guestName: true } },
        photo: { select: { rideName: true, rideId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const revenueToday = ordersToday.reduce((s, o) => s + (o.price || 0), 0);
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

    const countByType = (t: string) =>
      ordersToday.filter((o) => o.orderType === t).length;

    const hourlyMap: Record<string, { hour: string; revenue: number; orders: number }> =
      {};
    for (const o of ordersToday) {
      const hour = `${String(new Date(o.createdAt).getHours()).padStart(2, '0')}:00`;
      if (!hourlyMap[hour]) hourlyMap[hour] = { hour, revenue: 0, orders: 0 };
      hourlyMap[hour].revenue += o.price || 0;
      hourlyMap[hour].orders += 1;
    }

    const rideMap: Record<
      string,
      { ride_id: string; ride_name: string; photos: number; orders: number; revenue: number }
    > = {};
    const todayPhotos = await this.prisma.photo.findMany({
      where: { capturedAt: today },
      select: { rideId: true, rideName: true },
    });
    for (const p of todayPhotos) {
      const key = p.rideId;
      if (!rideMap[key]) {
        rideMap[key] = {
          ride_id: p.rideId,
          ride_name: p.rideName,
          photos: 0,
          orders: 0,
          revenue: 0,
        };
      }
      rideMap[key].photos += 1;
    }
    for (const o of ordersToday) {
      const key = o.photo.rideId;
      if (!rideMap[key]) {
        rideMap[key] = {
          ride_id: o.photo.rideId,
          ride_name: o.photo.rideName,
          photos: 0,
          orders: 0,
          revenue: 0,
        };
      }
      rideMap[key].orders += 1;
      rideMap[key].revenue += o.price || 0;
    }

    const recent_orders = ordersToday.slice(0, 12).map((o) => ({
      id: o.id,
      guest_name: o.visit.guestName,
      ride_name: o.photo.rideName,
      order_type: o.orderType,
      price: o.price,
      created_at: o.createdAt,
    }));

    return {
      success: true,
      stats: {
        guests_today: guestsToday,
        photos_today: photosToday,
        orders_today: ordersToday.length,
        revenue_today: revenueToday,
        pending_prints: pendingPrints,
        digital_orders: countByType('digital'),
        print_orders: countByType('print'),
        frame_orders: countByType('frame'),
        combo_orders: countByType('combo'),
        hourly_revenue: Object.values(hourlyMap).sort((a, b) =>
          a.hour.localeCompare(b.hour),
        ),
        rides_stats: Object.values(rideMap).sort((a, b) => b.revenue - a.revenue),
        recent_orders,
        wristbands: {
          total: wbStats._count,
          active: wbActive,
          inactive: wbInactive,
        },
      },
    };
  }
}

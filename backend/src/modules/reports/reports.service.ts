import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async daily(date?: string) {
    const reportDate = date ?? new Date().toISOString().split('T')[0];
    const start = new Date(`${reportDate}T00:00:00`);
    const end = new Date(`${reportDate}T23:59:59.999`);

    const rawOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      include: {
        visit: { select: { guestName: true, phone: true } },
        photo: { select: { rideName: true, s3Url: true } },
      },
    });

    const orders = rawOrders.map((o) => ({
      id: o.id,
      visit_id: o.visitId,
      photo_id: o.photoId,
      order_type: o.orderType,
      price: o.price,
      payment_mode: o.paymentMode,
      created_at: o.createdAt,
      guest_name: o.visit.guestName,
      phone: o.visit.phone,
      ride_name: o.photo.rideName,
      s3_url: o.photo.s3Url,
    }));

    const totalRevenue = orders.reduce((s, o) => s + (o.price || 0), 0);
    const totalOrders = orders.length;

    const byPayment: Record<string, { count: number; amount: number }> = {};
    const byType: Record<string, { count: number; amount: number }> = {};
    const byRide: Record<string, { count: number; amount: number }> = {};
    const byHour: Record<string, { count: number; amount: number }> = {};

    for (const o of orders) {
      const mode = o.payment_mode || 'cash';
      if (!byPayment[mode]) byPayment[mode] = { count: 0, amount: 0 };
      byPayment[mode].count++;
      byPayment[mode].amount += o.price || 0;

      if (!byType[o.order_type]) byType[o.order_type] = { count: 0, amount: 0 };
      byType[o.order_type].count++;
      byType[o.order_type].amount += o.price || 0;

      const ride = o.ride_name || 'Unknown';
      if (!byRide[ride]) byRide[ride] = { count: 0, amount: 0 };
      byRide[ride].count++;
      byRide[ride].amount += o.price || 0;

      const hour = new Date(o.created_at).getHours();
      const label = `${String(hour).padStart(2, '0')}:00`;
      if (!byHour[label]) byHour[label] = { count: 0, amount: 0 };
      byHour[label].count++;
      byHour[label].amount += o.price || 0;
    }

    return {
      success: true,
      report: {
        date: reportDate,
        park_name: this.config.get('PARK_NAME', 'RideSnap Park'),
        generated_at: new Date().toISOString(),
        summary: {
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          avg_order: totalOrders ? Math.round(totalRevenue / totalOrders) : 0,
        },
        by_payment: byPayment,
        by_type: byType,
        by_ride: byRide,
        by_hour: byHour,
        orders,
      },
    };
  }
}

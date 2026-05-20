import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { genId } from '../../common/utils/ids.util';
import { getPrices, isValidOrderType } from '../../config/pricing.config';
import { startOfTodayLocal, endOfTodayLocal } from '../../common/utils/date.util';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  private prices() {
    return getPrices(this.config);
  }

  private guestEmail(email?: string): string | null {
    if (!email?.includes('@')) return null;
    if (email.toLowerCase().includes('wonderla.com')) return null;
    return email;
  }

  private async receiptNo(orderId: string): Promise<string> {
    const count = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfTodayLocal(), lte: endOfTodayLocal() },
        id: { lte: orderId },
      },
    });
    return `RCP-${new Date().getFullYear()}-${String(count || 1).padStart(4, '0')}`;
  }

  private async processOrderEmail(
    orderId: string,
    photo: { s3Key: string | null; rideName: string },
    visit: { guestName: string | null } | null,
    orderType: string,
    price: number,
    paymentMode: string,
    visitId: string,
    email?: string,
  ) {
    const guestEmail = this.guestEmail(email);
    if (!guestEmail || !photo.s3Key) return;

    try {
      const isDigital = orderType === 'digital' || orderType === 'combo';
      const downloadUrl = isDigital
        ? await this.s3.getPresignedReadUrl(photo.s3Key, 7 * 24 * 3600)
        : null;
      const receiptNo = await this.receiptNo(orderId);
      const dateStr = new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      await this.email.sendReceiptWithPhoto({
        to: guestEmail,
        guestName: visit?.guestName ?? 'Guest',
        photoUrl: downloadUrl,
        orderId,
        rideName: photo.rideName,
        orderType,
        price,
        paymentMode,
        wristbandId: visitId,
        receiptNo,
        date: dateStr,
      });

      await this.prisma.order.update({
        where: { id: orderId },
        data: { emailSent: true },
      });
    } catch (e) {
      console.warn('Auto-email failed:', e);
    }
  }

  private async queuePrint(
    orderId: string,
    photoId: string,
    visitId: string,
    orderType: string,
    visit: { guestName: string | null; phone: string | null } | null,
  ) {
    if (!['print', 'frame', 'combo'].includes(orderType)) return;
    const printId = genId('PRN', 6);
    const printSize = orderType === 'frame' ? 'A4' : '6x4';
    await this.prisma.printQueueItem.create({
      data: {
        id: printId,
        orderId,
        photoId,
        visitId,
        guestName: visit?.guestName,
        phone: visit?.phone,
        printSize,
      },
    });
    await this.prisma.order.update({
      where: { id: orderId },
      data: { printQueued: true },
    });
  }

  async create(body: {
    visit_id: string;
    photo_id: string;
    order_type: string;
    email?: string;
    payment_mode?: string;
    payment_splits?: string;
  }) {
    const prices = this.prices();
    if (!isValidOrderType(body.order_type, prices)) {
      throw new BadRequestException({ success: false, error: 'Invalid order_type' });
    }

    const photo = await this.prisma.photo.findUnique({ where: { id: body.photo_id } });
    if (!photo) throw new NotFoundException({ success: false, error: 'Photo not found' });

    const visit = await this.prisma.visit.findUnique({ where: { id: body.visit_id } });
    const price = prices[body.order_type as keyof typeof prices];
    const orderId = genId('ORD', 6);

    let paidAmount = price;
    if (body.payment_splits) {
      const splits = JSON.parse(body.payment_splits) as Array<{ amount?: number }>;
      paidAmount = splits.reduce((s, p) => s + (p.amount ?? 0), 0);
    }
    const pStatus = paidAmount >= price ? 'paid' : paidAmount > 0 ? 'partial' : 'pending';
    const pMode = body.payment_mode ?? (body.payment_splits ? 'split' : 'cash');

    await this.prisma.order.create({
      data: {
        id: orderId,
        visitId: body.visit_id,
        photoId: body.photo_id,
        orderType: body.order_type,
        price,
        paymentStatus: pStatus,
        paymentMode: pMode,
        paymentSplits: body.payment_splits ?? null,
      },
    });

    await this.prisma.photo.update({
      where: { id: body.photo_id },
      data: { status: 'sold' },
    });

    await this.processOrderEmail(
      orderId,
      photo,
      visit,
      body.order_type,
      price,
      pMode,
      body.visit_id,
      body.email,
    );
    await this.queuePrint(orderId, body.photo_id, body.visit_id, body.order_type, visit);

    await this.prisma.wristband.updateMany({
      where: { id: body.visit_id, status: 'active' },
      data: { status: 'used' },
    });

    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    return { success: true, order, message: 'Order placed successfully!' };
  }

  async bulkCreate(body: {
    visit_id: string;
    photo_ids: string[];
    order_type: string;
    email?: string;
    payment_mode?: string;
    payment_splits?: string;
  }) {
    const prices = this.prices();
    if (!isValidOrderType(body.order_type, prices)) {
      throw new BadRequestException({ success: false, error: 'Invalid order_type' });
    }

    const visit = await this.prisma.visit.findUnique({ where: { id: body.visit_id } });
    const price = prices[body.order_type as keyof typeof prices];
    const orders = [];

    for (const photoId of body.photo_ids) {
      const photo = await this.prisma.photo.findUnique({ where: { id: photoId } });
      if (!photo) continue;

      const orderId = genId('ORD', 6);
      let paidAmt = price;
      if (body.payment_splits) {
        const splits = JSON.parse(body.payment_splits) as Array<{ amount?: number }>;
        paidAmt = splits.reduce((s, p) => s + (p.amount ?? 0), 0);
      }
      const pStat = paidAmt >= price ? 'paid' : paidAmt > 0 ? 'partial' : 'pending';
      const pMode = body.payment_mode ?? (body.payment_splits ? 'split' : 'cash');

      await this.prisma.order.create({
        data: {
          id: orderId,
          visitId: body.visit_id,
          photoId,
          orderType: body.order_type,
          price,
          paymentStatus: pStat,
          paymentMode: pMode,
          paymentSplits: body.payment_splits ?? null,
        },
      });
      await this.prisma.photo.update({ where: { id: photoId }, data: { status: 'sold' } });
      await this.processOrderEmail(
        orderId,
        photo,
        visit,
        body.order_type,
        price,
        pMode,
        body.visit_id,
        body.email,
      );
      await this.queuePrint(orderId, photoId, body.visit_id, body.order_type, visit);
      orders.push(await this.prisma.order.findUnique({ where: { id: orderId } }));
    }

    await this.prisma.wristband.updateMany({
      where: { id: body.visit_id, status: 'active' },
      data: { status: 'used' },
    });

    const totalAmount = price * orders.length;
    return {
      success: true,
      orders,
      count: orders.length,
      total: totalAmount,
      message: `${orders.length} order(s) placed — ₹${totalAmount} total`,
    };
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ success: false, error: 'Order not found' });
    return { success: true, order };
  }
}

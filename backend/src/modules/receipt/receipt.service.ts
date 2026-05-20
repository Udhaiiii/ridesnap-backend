import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { startOfTodayLocal, endOfTodayLocal } from '../../common/utils/date.util';

@Injectable()
export class ReceiptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getReceipt(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ success: false, error: 'Order not found' });

    const visit = await this.prisma.visit.findUnique({ where: { id: order.visitId } });
    const photo = await this.prisma.photo.findUnique({ where: { id: order.photoId } });

    const rcpNum = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfTodayLocal(), lte: endOfTodayLocal() },
        id: { lte: order.id },
      },
    });

    const dateStr = order.createdAt.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const typeLabels: Record<string, string> = {
      digital: 'Digital Copy',
      print: 'Print Copy',
      frame: 'Framed Print',
      combo: 'Combo Pack',
    };
    const payLabels: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI',
      card: 'Card / Swipe',
      split: 'Split Payment',
      razorpay: 'Online',
    };

    const gstRate = 18;
    const baseAmount = Math.round((order.price * 100) / (100 + gstRate) * 100) / 100;
    const gstAmount = Math.round((order.price - baseAmount) * 100) / 100;
    const cgst = Math.round((gstAmount / 2) * 100) / 100;
    const sgst = Math.round((gstAmount / 2) * 100) / 100;

    let paymentDetails = payLabels[order.paymentMode ?? ''] || order.paymentMode || 'Cash';
    if (order.paymentMode === 'split' && order.paymentSplits) {
      try {
        const splits = JSON.parse(order.paymentSplits) as Array<{ mode: string; amount: number }>;
        paymentDetails = splits
          .map((s) => `${payLabels[s.mode] || s.mode} ₹${s.amount}`)
          .join(' + ');
      } catch {
        /* ignore */
      }
    }

    const guestEmail =
      visit?.email && !visit.email.includes('wonderla.com') ? visit.email : '';

    return {
      success: true,
      receipt: {
        receipt_no: `RCP-${new Date().getFullYear()}-${String(rcpNum || 1).padStart(4, '0')}`,
        order_id: order.id,
        date: dateStr,
        park_name: this.config.get('PARK_NAME', 'RideSnap Park'),
        park_subtitle: this.config.get('PARK_SUBTITLE', 'Ride Photo Service'),
        park_phone: this.config.get('PARK_PHONE', ''),
        park_address: this.config.get('PARK_ADDRESS', ''),
        guest_name: visit?.guestName || 'Guest',
        guest_phone: visit?.phone || '',
        guest_email: guestEmail,
        wristband_id: order.visitId,
        item_name: typeLabels[order.orderType] || order.orderType,
        ride_name: photo?.rideName || '',
        amount: order.price,
        payment_mode: paymentDetails,
        payment_status: order.paymentStatus,
        sac_code: '998386',
        gst_note: 'GST not registered. Prices are inclusive of all taxes.',
        base_amount: baseAmount,
        cgst_rate: 9,
        cgst_amount: cgst,
        sgst_rate: 9,
        sgst_amount: sgst,
        total_tax: gstAmount,
        note: 'This is not a GST invoice. (For reference only)',
        footer: `Thank you for visiting ${this.config.get('PARK_NAME', 'RideSnap Park')}!`,
        validity:
          order.orderType === 'digital' || order.orderType === 'combo'
            ? 'Download link valid for 7 days'
            : 'Collect print at counter',
      },
    };
  }
}

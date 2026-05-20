import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { EmailService } from '../../infrastructure/email/email.service';
import { ShortLinksService } from '../short-links/short-links.service';
import { startOfTodayLocal, endOfTodayLocal } from '../../common/utils/date.util';

@Injectable()
export class SendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly email: EmailService,
    private readonly shortLinks: ShortLinksService,
    private readonly config: ConfigService,
  ) {}

  async sendEmail(orderId: string, email: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ success: false, error: 'Order not found' });

    const photo = await this.prisma.photo.findUnique({ where: { id: order.photoId } });
    const visit = await this.prisma.visit.findUnique({ where: { id: order.visitId } });
    if (!photo?.s3Key) throw new NotFoundException({ success: false, error: 'Photo not found' });

    const downloadUrl = await this.s3.getPresignedReadUrl(photo.s3Key, 7 * 24 * 3600);
    const rcpCnt = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfTodayLocal(), lte: endOfTodayLocal() },
        id: { lte: orderId },
      },
    });

    await this.email.sendReceiptWithPhoto({
      to: email,
      guestName: visit?.guestName ?? 'Guest',
      photoUrl: downloadUrl,
      orderId,
      rideName: photo.rideName,
      orderType: order.orderType,
      price: order.price,
      paymentMode: order.paymentMode ?? 'cash',
      wristbandId: order.visitId,
      receiptNo: `RCP-${new Date().getFullYear()}-${String(rcpCnt || 1).padStart(4, '0')}`,
      date: order.createdAt.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    });

    await this.prisma.visit.updateMany({
      where: { id: order.visitId, email: null },
      data: { email },
    });
    await this.prisma.order.update({ where: { id: orderId }, data: { emailSent: true } });

    return { success: true, message: `Email sent to ${email}` };
  }

  async sendSms(orderId: string, phone: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ success: false, error: 'Order not found' });

    const visit = await this.prisma.visit.findUnique({ where: { id: order.visitId } });
    const code = await this.shortLinks.getOrCreateShortLink(
      orderId,
      order.photoId,
      order.visitId,
    );
    const baseUrl = this.config.get('BASE_URL', 'http://localhost:5000');
    const shortUrl = `${baseUrl}/p/${code}`;
    const parkName = this.config.get('PARK_NAME', 'RideSnap Park');
    const guestName = visit?.guestName ?? 'Guest';
    const message = `Hi ${guestName}! Your ride photo from ${parkName} is ready. Download (7 days): ${shortUrl}`;

    const fast2smsKey = this.config.get('FAST2SMS_KEY');
    if (!fast2smsKey) throw new Error('FAST2SMS_KEY not set in .env');

    const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: { authorization: fast2smsKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        route: 'q',
        message,
        language: 'english',
        flash: 0,
        numbers: phone.replace(/[^0-9]/g, '').slice(-10),
      }),
    });

    const smsData = (await smsRes.json()) as { return?: boolean; message?: string };
    if (!smsData.return) throw new Error(smsData.message || 'SMS failed');

    await this.prisma.visit.updateMany({
      where: { id: order.visitId, phone: null },
      data: { phone },
    });

    return { success: true, message: `SMS sent to ${phone}`, short_url: shortUrl };
  }

  async whatsappLink(orderId: string, phone?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ success: false, error: 'Order not found' });

    const photo = await this.prisma.photo.findUnique({ where: { id: order.photoId } });
    const visit = await this.prisma.visit.findUnique({ where: { id: order.visitId } });
    const code = await this.shortLinks.getOrCreateShortLink(
      orderId,
      order.photoId,
      order.visitId,
    );
    const baseUrl = this.config.get('BASE_URL', 'http://localhost:5000');
    const shortUrl = `${baseUrl}/p/${code}`;
    const parkName = this.config.get('PARK_NAME', 'RideSnap Park');
    const guestName = visit?.guestName ?? 'there';

    const message = `Hi ${guestName}! 🎢 Your ride photo from *${parkName}* is ready!\n\n📸 Ride: ${photo?.rideName}\n\n⬇️ Download your photo (valid 7 days):\n${shortUrl}\n\nThank you for visiting ${parkName}! 🎉`;

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
    const waLink = cleanPhone
      ? `https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    return { success: true, whatsapp_url: waLink, message };
  }
}

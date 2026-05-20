import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.get('EMAIL_USER'),
        pass: config.get('EMAIL_PASS'),
      },
    });
  }

  private park() {
    return {
      name: this.config.get('PARK_NAME', 'RideSnap Park'),
      sub: this.config.get('PARK_SUBTITLE', 'Ride Photo Service'),
      addr: this.config.get('PARK_ADDRESS', ''),
      phone: this.config.get('PARK_PHONE', ''),
      website: this.config.get('PARK_WEBSITE', ''),
    };
  }

  private gst(amount: number) {
    const base = +(amount * 100 / 118).toFixed(2);
    const cgst = +(amount * 9 / 118).toFixed(2);
    const sgst = +(amount * 9 / 118).toFixed(2);
    return { base, cgst, sgst, tax: +(cgst + sgst).toFixed(2) };
  }

  async sendReceiptWithPhoto(params: {
    to: string;
    guestName: string;
    photoUrl: string | null;
    orderId: string;
    rideName: string;
    orderType: string;
    price: number;
    paymentMode: string;
    wristbandId: string;
    receiptNo: string;
    date: string;
  }): Promise<void> {
    const { to, guestName, photoUrl, orderId, rideName, orderType, price, paymentMode, wristbandId, receiptNo, date } =
      params;
    if (!to?.includes('@')) throw new Error('Invalid email address');

    const p = this.park();
    const g = this.gst(price);
    const typeLabel: Record<string, string> = {
      digital: 'Digital Copy',
      print: 'Print Copy',
      frame: 'Framed Print',
      combo: 'Combo Pack',
    };
    const payLabel: Record<string, string> = {
      cash: 'Cash',
      upi: 'UPI / QR',
      card: 'Card / Swipe',
      split: 'Split Payment',
      razorpay: 'Online',
    };
    const isDigital = orderType === 'digital' || orderType === 'combo';
    const isPrint = orderType === 'print' || orderType === 'frame' || orderType === 'combo';

    const html = `<!DOCTYPE html><html><body style="font-family:Arial;background:#f0efed;padding:24px">
      <motion style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:24px">
        <h1 style="color:#f59e0b">${p.name}</h1>
        <p>Hi <strong>${guestName}</strong>, thank you for visiting!</p>
        <p><strong>Receipt:</strong> ${receiptNo} · ${date}</p>
        <p><strong>Wristband:</strong> ${wristbandId} · <strong>Ride:</strong> ${rideName}</p>
        <p><strong>${typeLabel[orderType] ?? orderType}</strong> — ₹${price}</p>
        <p>Payment: ${payLabel[paymentMode] ?? paymentMode}</p>
        <p>Base ₹${g.base} · CGST ₹${g.cgst} · SGST ₹${g.sgst}</p>
        ${isDigital && photoUrl ? `<p><a href="${photoUrl}" style="background:#f59e0b;padding:12px 24px;color:#000;text-decoration:none;font-weight:bold">Download Photo</a></p>` : ''}
        ${isPrint ? '<p>🖨️ Collect your print at the Photo Counter</p>' : ''}
        <p style="font-size:11px;color:#888">Order: ${orderId}</p>
      </motion>
    </body></html>`;

    await this.transporter.sendMail({
      from: `${p.name} <${this.config.get('EMAIL_USER')}>`,
      to,
      subject: `✅ Receipt + Photo Ready · ${p.name} · ${receiptNo || orderId}`,
      html,
    });
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';

@Injectable()
export class ShortLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly config: ConfigService,
  ) {}

  makeCode(len = 6): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < len; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  async getOrCreateShortLink(orderId: string, photoId: string, visitId: string): Promise<string> {
    const existing = await this.prisma.shortLink.findFirst({ where: { orderId } });
    if (existing) return existing.code;

    let code: string;
    let attempts = 0;
    do {
      code = this.makeCode(6);
      attempts++;
    } while (
      (await this.prisma.shortLink.findUnique({ where: { code } })) &&
      attempts < 10
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.shortLink.create({
      data: { code, orderId, photoId, visitId, expiresAt },
    });
    return code;
  }

  async renderDownloadPage(code: string): Promise<{ html: string; status: number }> {
    const link = await this.prisma.shortLink.findUnique({
      where: { code: code.toUpperCase().trim() },
    });

    if (!link) {
      return {
        status: 404,
        html: '<html><body style="font-family:Arial;text-align:center;padding:60px;background:#0a0f1e;color:#fff"><h2>Link not found</h2></body></html>',
      };
    }

    if (new Date() > link.expiresAt) {
      return {
        status: 410,
        html: '<html><body style="font-family:Arial;text-align:center;padding:60px;background:#0a0f1e;color:#fff"><h2>Link Expired</h2></body></html>',
      };
    }

    await this.prisma.shortLink.update({
      where: { code: link.code },
      data: { clicks: { increment: 1 } },
    });

    const photo = await this.prisma.photo.findUnique({ where: { id: link.photoId } });
    const visit = await this.prisma.visit.findUnique({ where: { id: link.visitId } });
    const parkName = this.config.get('PARK_NAME', 'RideSnap Park');
    const guest = visit?.guestName ?? 'Guest';

    if (!photo?.s3Key) {
      return { status: 500, html: 'Photo not available.' };
    }

    const downloadUrl = await this.s3.getPresignedReadUrl(photo.s3Key, 24 * 3600);
    const expiry = link.expiresAt.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return {
      status: 200,
      html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your Ride Photo</title></head><body style="background:#0a0f1e;font-family:Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px">
<div style="background:#0d1829;border:1px solid #1e293b;border-radius:20px;padding:32px;max-width:420px;text-align:center;color:#f1f5f9">
<p style="color:#facc15;font-size:13px;letter-spacing:3px">📸 ${parkName}</p>
<h1 style="font-size:22px;margin:12px 0">Hi ${guest}! 👋</h1>
<p style="color:#475569;margin-bottom:16px">Your ride photo is ready</p>
<span style="background:#1e293b;padding:4px 12px;border-radius:20px;font-size:11px">🎢 ${photo.rideName}</span>
<img src="${downloadUrl}" style="width:100%;border-radius:12px;margin:20px 0;max-height:300px;object-fit:cover"/>
<a href="${downloadUrl}" download style="display:block;background:#facc15;color:#0f172a;padding:16px;border-radius:12px;text-decoration:none;font-weight:800">Download Full Photo</a>
<p style="color:#334155;font-size:11px;margin-top:16px">Expires ${expiry}</p>
</div></body></html>`,
    };
  }
}

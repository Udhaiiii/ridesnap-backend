import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { genId } from '../../common/utils/ids.util';
import sharp from 'sharp';

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private async imageMeta(buffer: Buffer) {
    const meta = await sharp(buffer).metadata();
    return { size: buffer.length, width: meta.width, height: meta.height };
  }

  async upload(
    file: Express.Multer.File,
    visitId: string,
    rideId?: string,
    rideName?: string,
  ) {
    if (!file) throw new ForbiddenException({ success: false, error: 'No photo file' });
    const wbId = visitId.toUpperCase().trim();

    const wb = await this.prisma.wristband.findUnique({ where: { id: wbId } });
    if (!wb) {
      throw new ForbiddenException({
        success: false,
        valid: false,
        error: `Invalid wristband: ${wbId}. Only pre-registered wristbands are accepted.`,
      });
    }

    const photoId = genId('PH', 6);
    const meta = await this.imageMeta(file.buffer);
    const origKey = this.s3.buildS3Key(rideId ?? 'R00', wbId, photoId, 'original');
    const origUrl = await this.s3.uploadToS3(file.buffer, origKey, file.mimetype);

    const photo = await this.prisma.$transaction(async (tx) => {
      await tx.visit.upsert({
        where: { id: wbId },
        create: { id: wbId, guestName: 'Guest' },
        update: {},
      });

      if (wb.status === 'inactive') {
        await tx.wristband.update({
          where: { id: wbId },
          data: { status: 'active', activatedAt: new Date() },
        });
      }

      return tx.photo.create({
        data: {
          id: photoId,
          visitId: wbId,
          rideId: rideId ?? 'R00',
          rideName: rideName ?? 'Unknown',
          s3Key: origKey,
          s3Url: origUrl,
          fileSize: meta.size,
          status: 'uploaded',
        },
      });
    });

    return {
      success: true,
      photo,
      message: `Photo linked to wristband ${wbId}`,
    };
  }

  async presign(visitId: string, rideId?: string) {
    const photoId = genId('PH', 6);
    const key = this.s3.buildS3Key(rideId ?? 'R00', visitId, photoId, 'original');
    const url = await this.s3.getPresignedUploadUrl(key);
    return { success: true, uploadUrl: url, photoId, s3Key: key };
  }

  async findOne(id: string) {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException({ success: false, error: 'Photo not found' });
    return { success: true, photo };
  }
}

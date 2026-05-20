import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly folder: string;

  constructor(private readonly config: ConfigService) {
    const accessKeyId = this.config.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get('AWS_SECRET_ACCESS_KEY');
    this.client = new S3Client({
      region: this.config.get('AWS_REGION', 'ap-south-1'),
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
    this.bucket = this.config.get('S3_BUCKET_NAME', '');
    this.folder = this.config.get('S3_FOLDER', 'digital2');
  }

  buildS3Key(rideId: string, visitId: string, photoId: string, type = 'original'): string {
    const date = new Date().toISOString().slice(0, 10);
    return `${this.folder}/rides/${rideId}/${date}/${visitId}/${photoId}_${type}.jpg`;
  }

  async uploadToS3(buffer: Buffer, key: string, contentType = 'image/jpeg'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
    const region = this.config.get('AWS_REGION', 'ap-south-1');
    return `https://${this.bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  async getPresignedUploadUrl(key: string, contentType = 'image/jpeg'): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );
  }

  async getPresignedReadUrl(key: string, expiresInSeconds = 604_800): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteFromS3(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

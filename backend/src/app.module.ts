import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './modules/auth/auth.guard';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { WristbandsModule } from './modules/wristbands/wristbands.module';
import { VisitsModule } from './modules/visits/visits.module';
import { PhotosModule } from './modules/photos/photos.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrintQueueModule } from './modules/print-queue/print-queue.module';
import { RidesModule } from './modules/rides/rides.module';
import { StatsModule } from './modules/stats/stats.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReceiptModule } from './modules/receipt/receipt.module';
import { SendModule } from './modules/send/send.module';
import { ConfigApiModule } from './modules/config/config.module';
import { ShortLinksModule } from './modules/short-links/short-links.module';
import { PrintModule } from './modules/print/print.module';
import { HealthModule } from './modules/health/health.module';
import { S3Module } from './infrastructure/s3/s3.module';
import { EmailModule } from './infrastructure/email/email.module';
import { PrinterModule } from './infrastructure/printer/printer.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    S3Module,
    EmailModule,
    PrinterModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        serializers: { req: (req) => ({ method: req.method, url: req.url }) },
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 200 },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    WristbandsModule,
    VisitsModule,
    PhotosModule,
    OrdersModule,
    PrintQueueModule,
    RidesModule,
    StatsModule,
    ReportsModule,
    ReceiptModule,
    SendModule,
    ConfigApiModule,
    ShortLinksModule,
    PrintModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}

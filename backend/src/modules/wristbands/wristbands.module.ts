import { Module } from '@nestjs/common';
import { WristbandsController } from './wristbands.controller';
import { WristbandsService } from './wristbands.service';

@Module({ controllers: [WristbandsController], providers: [WristbandsService] })
export class WristbandsModule {}

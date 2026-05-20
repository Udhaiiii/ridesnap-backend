import { Module } from '@nestjs/common';
import { PrintController } from './print.controller';

@Module({ controllers: [PrintController] })
export class PrintModule {}

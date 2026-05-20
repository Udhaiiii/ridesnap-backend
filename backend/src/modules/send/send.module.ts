import { Module } from '@nestjs/common';
import { SendController } from './send.controller';
import { SendService } from './send.service';
import { ShortLinksModule } from '../short-links/short-links.module';

@Module({
  imports: [ShortLinksModule],
  controllers: [SendController],
  providers: [SendService],
})
export class SendModule {}

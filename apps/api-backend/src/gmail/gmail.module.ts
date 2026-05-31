import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { GmailController } from './gmail.controller';
import { GmailCron } from './gmail.cron';
import { GmailService } from './gmail.service';

@Module({
  imports: [AuthModule],
  controllers: [GmailController],
  providers: [GmailService, GmailCron],
  exports: [GmailService],
})
export class GmailModule {}

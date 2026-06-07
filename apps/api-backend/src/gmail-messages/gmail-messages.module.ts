import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { GmailMessagesController } from './gmail-messages.controller';
import { GmailMessagesService } from './gmail-messages.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GmailMessagesController],
  providers: [GmailMessagesService],
})
export class GmailMessagesModule {}

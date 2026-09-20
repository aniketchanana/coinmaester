import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { EmailBodyController } from './email-body.controller';
import { GmailMessagesController } from './gmail-messages.controller';
import { GmailMessagesService } from './gmail-messages.service';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule],
  controllers: [GmailMessagesController, EmailBodyController],
  providers: [GmailMessagesService],
})
export class GmailMessagesModule {}

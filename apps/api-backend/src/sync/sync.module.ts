import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StorageModule } from '../storage/storage.module';
import { GmailIngestionService } from './gmail-ingestion.service';
import { SyncCleanupCron } from './sync-cleanup.cron';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule, MessagingModule],
  controllers: [SyncController],
  providers: [SyncService, GmailIngestionService, SyncCleanupCron],
})
export class SyncModule {}

import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { GmailIngestionService } from './gmail-ingestion.service';
import { SyncCleanupCron } from './sync-cleanup.cron';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncWorkerCron } from './sync-worker.cron';

@Module({
  imports: [DatabaseModule, AuthModule, StorageModule],
  controllers: [SyncController],
  providers: [
    SyncService,
    GmailIngestionService,
    SyncWorkerCron,
    SyncCleanupCron,
  ],
})
export class SyncModule {}

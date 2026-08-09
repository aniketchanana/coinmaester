import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GrpcModule } from './grpc/grpc.module';
import { MessagingModule } from './messaging/messaging.module';
import { GmailMessagesModule } from './gmail-messages/gmail-messages.module';
import { SyncModule } from './sync/sync.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PresetFiltersModule } from './preset-filters/preset-filters.module';
import { TransactionsModule } from './transactions/transactions.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 20 },
      { name: 'long', ttl: 60_000, limit: 300 },
    ]),
    DatabaseModule,
    ScheduleModule.forRoot(),
    MessagingModule,
    AuthModule,
    SyncModule,
    TransactionsModule,
    PresetFiltersModule,
    AnalyticsModule,
    GmailMessagesModule,
    GrpcModule,
    McpModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}

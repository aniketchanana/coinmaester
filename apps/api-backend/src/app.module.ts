import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GrpcModule } from './grpc/grpc.module';
import { MessagingModule } from './messaging/messaging.module';
import { GmailMessagesModule } from './gmail-messages/gmail-messages.module';
import { SyncModule } from './sync/sync.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    MessagingModule,
    AuthModule,
    SyncModule,
    TransactionsModule,
    GmailMessagesModule,
    GrpcModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

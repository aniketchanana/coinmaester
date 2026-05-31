import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { prisma } from '@repo/database';

import { AppController } from './app.controller';
import { EmailsModule } from './emails/emails.module';
import { GmailModule } from './gmail/gmail.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

export const PRISMA = 'PRISMA';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useValue: prisma,
    },
  ],
  exports: [PRISMA],
})
class PrismaProviderModule {}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaProviderModule,
    PrismaModule,
    HealthModule,
    QueueModule,
    GmailModule,
    EmailsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

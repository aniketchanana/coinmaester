import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { GmailModule } from './gmail/gmail.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    GmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

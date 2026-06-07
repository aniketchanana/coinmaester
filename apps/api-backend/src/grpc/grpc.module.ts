import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { GmailMessageGrpcController } from './gmail-message.grpc-controller';
import { GmailMessageProcessingService } from './gmail-message-processing.service';

@Module({
  imports: [DatabaseModule],
  controllers: [GmailMessageGrpcController],
  providers: [GmailMessageProcessingService],
})
export class GrpcModule {}

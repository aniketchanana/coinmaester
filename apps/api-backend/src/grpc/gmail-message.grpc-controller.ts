import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { GmailMessageProcessingService } from './gmail-message-processing.service';

@Controller()
export class GmailMessageGrpcController {
  constructor(
    private readonly gmailMessageProcessingService: GmailMessageProcessingService,
  ) {}

  @GrpcMethod('GmailMessageProcessing', 'ClaimForProcessing')
  claimForProcessing(data: { gmailMessageId: string }) {
    return this.gmailMessageProcessingService.claimForProcessing(
      data.gmailMessageId,
    );
  }

  @GrpcMethod('GmailMessageProcessing', 'CompleteProcessing')
  completeProcessing(data: { gmailMessageId: string }) {
    return this.gmailMessageProcessingService.completeProcessing(
      data.gmailMessageId,
    );
  }
}

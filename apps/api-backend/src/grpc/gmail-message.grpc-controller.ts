import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { GmailMessageProcessingService } from './gmail-message-processing.service';

interface CompleteProcessingRequest {
  gmailMessageId: string;
  transaction?: {
    bankName: string;
    transactionValue: number;
    type: string;
    transactionDate: string;
    paymentMadeTo: string;
  };
  failureReason?: string;
}

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
  completeProcessing(data: CompleteProcessingRequest) {
    return this.gmailMessageProcessingService.completeProcessing({
      gmailMessageId: data.gmailMessageId,
      transaction: data.transaction,
      failureReason: data.failureReason,
    });
  }
}

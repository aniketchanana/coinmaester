import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { GmailMessageProcessingService } from './gmail-message-processing.service';

type GrpcTransactionPayload = Record<string, unknown>;

@Controller()
export class GmailMessageGrpcController {
  constructor(
    private readonly gmailMessageProcessingService: GmailMessageProcessingService,
  ) { }

  @GrpcMethod('GmailMessageProcessing', 'ClaimForProcessing')
  claimForProcessing(data: Record<string, unknown>) {
    const gmailMessageId = String(
      data.gmailMessageId ?? data.gmail_message_id ?? '',
    );

    return this.gmailMessageProcessingService.claimForProcessing(
      gmailMessageId,
    );
  }

  @GrpcMethod('GmailMessageProcessing', 'CompleteProcessing')
  completeProcessing(data: Record<string, unknown>) {
    const gmailMessageId = String(
      data.gmailMessageId ?? data.gmail_message_id ?? '',
    );
    const failureReasonRaw = data.failureReason ?? data.failure_reason;
    const failureReason =
      typeof failureReasonRaw === 'string' && failureReasonRaw.trim()
        ? failureReasonRaw
        : undefined;
    const transaction = data.transaction as GrpcTransactionPayload | undefined;

    console.log('---------');
    console.log(data);
    console.log('---------');
    return this.gmailMessageProcessingService.completeProcessing({
      gmailMessageId,
      transaction,
      failureReason,
    });
  }
}

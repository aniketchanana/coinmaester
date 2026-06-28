import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SkipThrottle } from '@nestjs/throttler';

import { GmailMessageProcessingService } from './gmail-message-processing.service';

type GrpcTransactionPayload = Record<string, unknown>;

function readGmailMessageId(data: Record<string, unknown>): string {
  const raw = data.gmailMessageId ?? data.gmail_message_id;
  return typeof raw === 'string' ? raw : '';
}

// HTTP rate limiting does not apply to the internal gRPC transport.
@SkipThrottle()
@Controller()
export class GmailMessageGrpcController {
  constructor(
    private readonly gmailMessageProcessingService: GmailMessageProcessingService,
  ) {}

  @GrpcMethod('GmailMessageProcessing', 'ClaimForProcessing')
  claimForProcessing(data: Record<string, unknown>) {
    const gmailMessageId = readGmailMessageId(data);

    return this.gmailMessageProcessingService.claimForProcessing(
      gmailMessageId,
    );
  }

  @GrpcMethod('GmailMessageProcessing', 'CompleteProcessing')
  completeProcessing(data: Record<string, unknown>) {
    const gmailMessageId = readGmailMessageId(data);
    const failureReasonRaw = data.failureReason ?? data.failure_reason;
    const failureReason =
      typeof failureReasonRaw === 'string' && failureReasonRaw.trim()
        ? failureReasonRaw
        : undefined;
    const transaction = data.transaction as GrpcTransactionPayload | undefined;

    return this.gmailMessageProcessingService.completeProcessing({
      gmailMessageId,
      transaction,
      failureReason,
    });
  }
}

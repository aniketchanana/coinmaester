import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

const EMAIL_QUEUE_NAME = 'email-processing';

@Injectable()
export class QueueService implements OnModuleInit {
  private queue: Queue | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      return;
    }

    this.queue = new Queue(EMAIL_QUEUE_NAME, {
      connection: {
        url: redisUrl,
        maxRetriesPerRequest: null,
      },
    });
  }

  async enqueueEmailProcessing(emailMessageId: string, userId: string) {
    if (!this.queue) {
      return;
    }

    await this.queue.add(
      'process-email',
      { emailMessageId, userId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      },
    );
  }
}

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import amqp, { type Channel, type ChannelModel } from 'amqplib';

import { isAiParsingEnabled } from '../common/ai-parsing';

@Injectable()
export class RabbitMqPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMqPublisherService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private readonly enabled = isAiParsingEnabled();

  private get rabbitMqUrl(): string {
    const url = process.env.RABBITMQ_URL?.trim();
    if (!url) {
      throw new Error('RABBITMQ_URL environment variable is required');
    }
    return url;
  }

  private get queueName(): string {
    return process.env.RABBITMQ_QUEUE ?? 'gmail.messages.process';
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        'AI_PARSING_ENABLED is false — skipping RabbitMQ publisher connection',
      );
      return;
    }

    this.connection = await amqp.connect(this.rabbitMqUrl);
    this.channel = await this.connection.createChannel();
    await this.channel.assertQueue(this.queueName, { durable: true });
    this.logger.log(`RabbitMQ publisher connected (queue: ${this.queueName})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  publishGmailMessage(gmailMessageId: string): void {
    if (!this.enabled) {
      this.logger.debug(
        `Skipping RabbitMQ publish for ${gmailMessageId} (AI parsing disabled)`,
      );
      return;
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }

    const payload = Buffer.from(JSON.stringify({ gmailMessageId }));
    this.channel.sendToQueue(this.queueName, payload, {
      persistent: true,
      contentType: 'application/json',
    });
  }
}

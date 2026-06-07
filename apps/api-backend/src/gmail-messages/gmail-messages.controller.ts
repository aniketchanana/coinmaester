import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailMessagesService } from './gmail-messages.service';
import type {
  ListGmailMessagesResponse,
  RetryGmailMessagesBody,
  RetryGmailMessagesResponse,
} from './gmail-messages.types';

@Controller('gmail-messages')
@UseGuards(JwtAuthGuard)
export class GmailMessagesController {
  constructor(private readonly gmailMessagesService: GmailMessagesService) {}

  @Get()
  listGmailMessages(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<ListGmailMessagesResponse> {
    return this.gmailMessagesService.listGmailMessages(user.sub, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      status: status || undefined,
    });
  }

  @Post('retry')
  @HttpCode(HttpStatus.OK)
  retryGmailMessages(
    @CurrentUser() user: JwtPayload,
    @Body() body: RetryGmailMessagesBody,
  ): Promise<RetryGmailMessagesResponse> {
    return this.gmailMessagesService.retryGmailMessages(user.sub, body.ids);
  }
}

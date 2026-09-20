import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailMessagesService } from './gmail-messages.service';
import type { GetEmailBodyResponse } from './gmail-messages.types';

@Controller('get-email-body')
@UseGuards(JwtAuthGuard)
export class EmailBodyController {
  constructor(private readonly gmailMessagesService: GmailMessagesService) {}

  @Get(':gmailMessageId')
  getEmailBody(
    @CurrentUser() user: JwtPayload,
    @Param('gmailMessageId') gmailMessageId: string,
  ): Promise<GetEmailBodyResponse> {
    return this.gmailMessagesService.getEmailBody(user.sub, gmailMessageId);
  }
}

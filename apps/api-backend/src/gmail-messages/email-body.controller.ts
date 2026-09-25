import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GmailMessagesService } from './gmail-messages.service';

@Controller('get-email-body')
@UseGuards(JwtAuthGuard)
export class EmailBodyController {
  constructor(private readonly gmailMessagesService: GmailMessagesService) {}

  @Get(':gmailMessageId')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async getEmailBody(
    @CurrentUser() user: JwtPayload,
    @Param('gmailMessageId') gmailMessageId: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<string> {
    const email = await this.gmailMessagesService.getEmailBody(
      user.sub,
      gmailMessageId,
    );

    response.setHeader('X-Email-From', encodeURIComponent(email.from));
    response.setHeader('X-Email-Subject', encodeURIComponent(email.subject));
    response.setHeader(
      'X-Email-Received-At',
      encodeURIComponent(email.receivedAt),
    );
    response.setHeader(
      'Access-Control-Expose-Headers',
      'X-Email-From, X-Email-Subject, X-Email-Received-At',
    );

    return email.html;
  }
}

import { Controller, Post, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.types';
import { GmailService } from './gmail.service';

@Controller('gmail')
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  sync(@CurrentUser() user: JwtPayload) {
    return this.gmailService.syncUserEmails(user.sub);
  }
}

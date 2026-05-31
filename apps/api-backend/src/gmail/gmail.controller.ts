import {
  Controller,
  Headers,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import { InternalApiGuard } from '../auth/internal-api.guard';
import { GmailService } from './gmail.service';

@Controller('internal/sync')
@UseGuards(InternalApiGuard)
export class GmailController {
  constructor(private readonly gmailService: GmailService) {}

  @Post(':userId')
  async syncUser(
    @Param('userId') userId: string,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    if (headerUserId && headerUserId !== userId) {
      throw new UnauthorizedException('User ID mismatch');
    }

    return this.gmailService.syncUser(userId);
  }
}

import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SyncService } from './sync.service';
import type {
  CreateSyncJobResponse,
  LatestSyncStatusResponse,
} from './sync.types';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createSyncJob(
    @CurrentUser() user: JwtPayload,
  ): Promise<CreateSyncJobResponse> {
    console.log(process.env.AI_PARSING_ENABLED);
    return this.syncService.createSyncJob(user.sub);
  }

  @Get('latest')
  getLatestSyncStatus(
    @CurrentUser() user: JwtPayload,
  ): Promise<LatestSyncStatusResponse> {
    return this.syncService.getLatestSyncStatus(user.sub);
  }
}

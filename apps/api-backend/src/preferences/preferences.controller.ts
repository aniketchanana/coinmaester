import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreferencesService } from './preferences.service';
import type {
  PreferencesDto,
  UpdatePreferencesBody,
} from './preferences.types';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  getPreferences(@CurrentUser() user: JwtPayload): Promise<PreferencesDto> {
    return this.preferencesService.getPreferences(user.sub);
  }

  @Put()
  updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() body: UpdatePreferencesBody,
  ): Promise<PreferencesDto> {
    return this.preferencesService.updatePreferences(user.sub, body);
  }
}

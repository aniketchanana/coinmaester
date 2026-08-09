import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PresetFiltersService } from './preset-filters.service';
import type {
  CreatePresetFilterBody,
  PresetFilterDto,
  UpdatePresetFilterBody,
} from './preset-filters.types';

@Controller('preset-filters')
@UseGuards(JwtAuthGuard)
export class PresetFiltersController {
  constructor(private readonly presetFiltersService: PresetFiltersService) { }

  @Get()
  listPresetFilters(
    @CurrentUser() user: JwtPayload,
  ): Promise<PresetFilterDto[]> {
    return this.presetFiltersService.listPresetFilters(user.sub);
  }

  @Post()
  createPresetFilter(
    @CurrentUser() user: JwtPayload,
    @Body() body: CreatePresetFilterBody,
  ): Promise<PresetFilterDto> {
    return this.presetFiltersService.createPresetFilter(user.sub, body);
  }

  @Patch(':id')
  updatePresetFilter(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: UpdatePresetFilterBody,
  ): Promise<PresetFilterDto> {
    return this.presetFiltersService.updatePresetFilter(user.sub, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePresetFilter(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    return this.presetFiltersService.deletePresetFilter(user.sub, id);
  }
}

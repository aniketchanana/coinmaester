import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { PresetFiltersController } from './preset-filters.controller';
import { PresetFiltersService } from './preset-filters.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PresetFiltersController],
  providers: [PresetFiltersService],
})
export class PresetFiltersModule {}

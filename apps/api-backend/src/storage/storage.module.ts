import { Module } from '@nestjs/common';

import { EmailFileStorageService } from './email-file-storage.service';

@Module({
  providers: [EmailFileStorageService],
  exports: [EmailFileStorageService],
})
export class StorageModule {}

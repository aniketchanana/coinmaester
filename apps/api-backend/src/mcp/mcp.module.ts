import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SyncModule } from '../sync/sync.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { McpApiKeyController } from './api-key-management/mcp-api-key.controller';
import { McpApiKeyService } from './api-key-management/mcp-api-key.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [AuthModule, TransactionsModule, SyncModule],
  controllers: [McpController, McpApiKeyController],
  providers: [McpService, McpApiKeyService],
})
export class McpModule {}

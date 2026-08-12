import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SyncModule } from '../sync/sync.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { McpApiKeyController } from './api-key-management/mcp-api-key.controller';
import { McpApiKeyService } from './api-key-management/mcp-api-key.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { OAuthClientsStore } from './oauth/oauth-clients.store';
import { OAuthProvider } from './oauth/oauth.provider';

@Module({
  imports: [AuthModule, TransactionsModule, SyncModule],
  controllers: [McpController, McpApiKeyController],
  providers: [McpService, McpApiKeyService, OAuthClientsStore, OAuthProvider],
  exports: [OAuthProvider],
})
export class McpModule {}

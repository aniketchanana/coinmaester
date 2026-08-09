import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { JwtPayload } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { McpApiKeyService } from '../api-key-management/mcp-api-key.service';

@Controller('mcp/keys')
@UseGuards(JwtAuthGuard)
export class McpApiKeyController {
  constructor(private readonly apiKeys: McpApiKeyService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() body: { name?: string }) {
    return this.apiKeys.createKey(user.sub, body?.name ?? '');
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.apiKeys.listKeys(user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.apiKeys.revokeKey(user.sub, id);
  }
}

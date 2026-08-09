import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  type McpAuthenticatedRequest,
  McpAuthGuard,
} from './guards/mcp-auth.guard';
import { McpService } from './mcp.service';

@Controller('mcp')
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  @UseGuards(McpAuthGuard)
  async handleMcp(
    @Req() req: McpAuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    const userId = req.mcpUserId;
    const server = this.mcpService.createServer(userId);
    // stateless
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  // Stateless server: no server-initiated SSE stream or session termination.
  @Get()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  handleGet() {
    return {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    };
  }

  @Delete()
  @HttpCode(HttpStatus.METHOD_NOT_ALLOWED)
  handleDelete() {
    return {
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    };
  }
}

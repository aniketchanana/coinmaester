import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  generateApiKey,
  hashApiKey,
} from '../../common/mcp-api-key-encryption';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class McpApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string) {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Key name is required');
    }
    const { key, prefix, keyHash } = generateApiKey();

    const record = await this.prisma.client.mcpApiKey.create({
      data: { userId, name: trimmed, prefix, keyHash },
    });

    return {
      id: record.id,
      name: record.name,
      prefix,
      key,
      createdAt: record.createdAt,
    };
  }

  async verifyKey(presentedKey: string): Promise<string | null> {
    if (!presentedKey) {
      return null;
    }

    const keyHash = hashApiKey(presentedKey);
    const record = await this.prisma.client.mcpApiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: { id: true, userId: true },
    });

    if (!record) {
      return null;
    }

    // await this.prisma.client.mcpApiKey.update({
    //   where: { id: record.id },
    //   data: { lastUsedAt: new Date() },
    // });

    return record.userId;
  }

  async listKeys(userId: string) {
    return await this.prisma.client.mcpApiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeKey(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.client.mcpApiKey.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('API key not found');
    }
    if (existing.revokedAt) {
      return;
    }
    await this.prisma.client.mcpApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }
}

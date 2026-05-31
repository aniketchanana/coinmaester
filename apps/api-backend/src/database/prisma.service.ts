import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getPrisma, type PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = getPrisma();

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

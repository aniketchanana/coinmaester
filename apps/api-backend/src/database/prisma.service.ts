import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { getPrisma, Prisma, type PrismaClient } from '@repo/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient = getPrisma();

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.client.$transaction(fn);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

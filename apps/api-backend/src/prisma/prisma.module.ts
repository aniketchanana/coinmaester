import { Global, Module } from '@nestjs/common';
import { PRISMA } from '../app.module';

export { PRISMA };

@Global()
@Module({
  exports: [PRISMA],
})
export class PrismaModule {}

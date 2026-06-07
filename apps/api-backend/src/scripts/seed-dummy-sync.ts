import '../load-env';

import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { PrismaService } from '../database/prisma.service';
import { GmailIngestionService } from '../sync/gmail-ingestion.service';

function printUsage(): void {
  console.log(`Usage: pnpm seed:dummy-sync [userId]

Creates a completed emailSync row and one dummy Gmail message using the
same persistence + RabbitMQ publish path as a real sync.

Arguments:
  userId   Optional. Defaults to the first user in the database.
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printUsage();
    return;
  }

  const userIdArg = args[0];

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const prisma = app.get(PrismaService);
    const ingestion = app.get(GmailIngestionService);

    let userId = userIdArg;

    if (!userId) {
      const user = await prisma.client.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
      });

      if (!user) {
        console.error(
          'No users found. Sign in once or pass a userId: pnpm seed:dummy-sync <userId>',
        );
        process.exitCode = 1;
        return;
      }

      userId = user.id;
      console.log(`Using user ${user.email} (${user.id})`);
    }

    const result = await ingestion.seedDummySyncAndMessage(userId);

    console.log('Dummy sync seeded successfully:');
    console.log(`  emailSyncId:    ${result.emailSyncId}`);
    console.log(`  gmailMessageId: ${result.gmailMessageId}`);
    console.log(`  messageId:      ${result.messageId}`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`seed-dummy-sync failed: ${message}`);
  process.exitCode = 1;
});

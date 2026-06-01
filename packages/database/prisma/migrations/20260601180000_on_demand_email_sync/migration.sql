-- CreateEnum
CREATE TYPE "EmailSyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- Migrate legacy cursor data into completed jobs before dropping old table
CREATE TABLE "emailSync" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "EmailSyncStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,

    CONSTRAINT "emailSync_pkey" PRIMARY KEY ("id")
);

INSERT INTO "emailSync" ("id", "createdAt", "updatedAt", "status", "userId")
SELECT
    gen_random_uuid()::text,
    es."lastSyncTime",
    es."lastSyncTime",
    'COMPLETED'::"EmailSyncStatus",
    es."userId"
FROM "email_sync" es;

-- CreateTable
CREATE TABLE "gmailMessages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "header" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "gmailMessages_pkey" PRIMARY KEY ("id")
);

-- DropTable
DROP TABLE "email_sync";

-- CreateIndex
CREATE INDEX "emailSync_userId_createdAt_idx" ON "emailSync"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "emailSync_status_createdAt_idx" ON "emailSync"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "gmailMessages_messageId_key" ON "gmailMessages"("messageId");

-- AddForeignKey
ALTER TABLE "emailSync" ADD CONSTRAINT "emailSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

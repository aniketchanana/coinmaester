-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable: add userId to gmailMessages (backfill from first user for existing rows)
ALTER TABLE "gmailMessages" ADD COLUMN "userId" TEXT;

UPDATE "gmailMessages"
SET "userId" = (SELECT "id" FROM "users" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "userId" IS NULL;

DELETE FROM "gmailMessages" WHERE "userId" IS NULL;

ALTER TABLE "gmailMessages" ALTER COLUMN "userId" SET NOT NULL;

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "transactionValue" DECIMAL(14,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "paymentMadeTo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_gmailMessageId_key" ON "transactions"("gmailMessageId");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_idx" ON "transactions"("userId", "transactionDate" DESC);

-- CreateIndex
CREATE INDEX "gmailMessages_userId_idx" ON "gmailMessages"("userId");

-- AddForeignKey
ALTER TABLE "gmailMessages" ADD CONSTRAINT "gmailMessages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_gmailMessageId_fkey" FOREIGN KEY ("gmailMessageId") REFERENCES "gmailMessages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

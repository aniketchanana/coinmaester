-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "transactions_userId_isDeleted_idx" ON "transactions"("userId", "isDeleted");

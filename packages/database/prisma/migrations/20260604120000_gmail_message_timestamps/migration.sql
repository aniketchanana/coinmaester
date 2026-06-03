-- AlterTable
ALTER TABLE "gmailMessages" ADD COLUMN     "internalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "gmailMessages_internalDate_idx" ON "gmailMessages"("internalDate" DESC);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'google',
    "providerAccountId" TEXT NOT NULL,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "accessTokenExpires" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Backfill one account per existing user (tokens + googleId move off users)
INSERT INTO "accounts" (
    "id",
    "userId",
    "provider",
    "providerAccountId",
    "refreshToken",
    "accessToken",
    "accessTokenExpires",
    "scope",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    u."id",
    'google',
    u."googleId",
    u."refreshToken",
    u."accessToken",
    u."accessTokenExpires",
    u."scope",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users" u;

-- Add accountId to emailSync (nullable first for backfill)
ALTER TABLE "emailSync" ADD COLUMN "accountId" TEXT;

-- Backfill emailSync.accountId from the user's (single) account
UPDATE "emailSync" e
SET "accountId" = a."id"
FROM "accounts" a
WHERE a."userId" = e."userId";

-- Enforce NOT NULL after backfill
ALTER TABLE "emailSync" ALTER COLUMN "accountId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "emailSync_accountId_createdAt_idx" ON "emailSync"("accountId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailSync" ADD CONSTRAINT "emailSync_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropIndex
DROP INDEX "users_googleId_key";

-- AlterTable: remove OAuth fields from users
ALTER TABLE "users" DROP COLUMN "googleId",
DROP COLUMN "refreshToken",
DROP COLUMN "accessToken",
DROP COLUMN "accessTokenExpires",
DROP COLUMN "scope";

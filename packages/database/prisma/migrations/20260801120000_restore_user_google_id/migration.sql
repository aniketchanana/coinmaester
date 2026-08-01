-- AlterTable: restore the Google `sub` on users as the login identity (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;

-- Backfill from each user's oldest linked Google account
UPDATE "users" u
SET "googleId" = a."providerAccountId"
FROM (
    SELECT DISTINCT ON ("userId")
        "userId",
        "providerAccountId"
    FROM "gmailAccounts"
    WHERE "provider" = 'google'
    ORDER BY "userId", "createdAt" ASC, "id" ASC
) a
WHERE a."userId" = u."id";

-- Enforce NOT NULL after backfill
ALTER TABLE "users" ALTER COLUMN "googleId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

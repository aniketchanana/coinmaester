-- RenameTable
ALTER TABLE "accounts" RENAME TO "gmailAccounts";

-- RenameIndex
ALTER INDEX "accounts_pkey" RENAME TO "gmailAccounts_pkey";
ALTER INDEX "accounts_provider_providerAccountId_key" RENAME TO "gmailAccounts_provider_providerAccountId_key";
ALTER INDEX "accounts_userId_idx" RENAME TO "gmailAccounts_userId_idx";

-- RenameForeignKey
ALTER TABLE "gmailAccounts" RENAME CONSTRAINT "accounts_userId_fkey" TO "gmailAccounts_userId_fkey";

-- RenameColumn on emailSync
ALTER TABLE "emailSync" RENAME COLUMN "accountId" TO "gmailAccountId";

-- RenameIndex
ALTER INDEX "emailSync_accountId_createdAt_idx" RENAME TO "emailSync_gmailAccountId_createdAt_idx";

-- RenameForeignKey
ALTER TABLE "emailSync" RENAME CONSTRAINT "emailSync_accountId_fkey" TO "emailSync_gmailAccountId_fkey";

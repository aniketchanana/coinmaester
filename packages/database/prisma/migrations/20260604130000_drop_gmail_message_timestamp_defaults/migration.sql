-- Align gmailMessages timestamp defaults with Prisma-managed values.
ALTER TABLE "gmailMessages" ALTER COLUMN "internalDate" DROP DEFAULT;
ALTER TABLE "gmailMessages" ALTER COLUMN "updatedAt" DROP DEFAULT;

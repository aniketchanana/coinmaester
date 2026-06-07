-- Rename shared status enum for emailSync and gmailMessages.
ALTER TYPE "EmailSyncStatus" RENAME TO "SyncStatus";

-- Backfill existing gmailMessages rows with PENDING.
ALTER TABLE "gmailMessages" ADD COLUMN "status" "SyncStatus" NOT NULL DEFAULT 'PENDING';

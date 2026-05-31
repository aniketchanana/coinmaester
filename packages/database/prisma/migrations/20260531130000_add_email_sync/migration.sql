-- CreateTable
CREATE TABLE "email_sync" (
    "userId" TEXT NOT NULL,
    "lastSyncTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_sync_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "email_sync" ADD CONSTRAINT "email_sync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

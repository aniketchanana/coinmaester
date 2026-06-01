-- RenameTable
ALTER TABLE "User" RENAME TO "users";

-- RenameIndex
ALTER INDEX "User_googleId_key" RENAME TO "users_googleId_key";
ALTER INDEX "User_email_key" RENAME TO "users_email_key";

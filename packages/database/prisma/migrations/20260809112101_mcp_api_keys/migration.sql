-- CreateTable
CREATE TABLE "mcpApiKeys" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mcpApiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mcpApiKeys_keyHash_key" ON "mcpApiKeys"("keyHash");

-- CreateIndex
CREATE INDEX "mcpApiKeys_userId_idx" ON "mcpApiKeys"("userId");

-- AddForeignKey
ALTER TABLE "mcpApiKeys" ADD CONSTRAINT "mcpApiKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

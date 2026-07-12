-- CreateTable
CREATE TABLE "presetFilters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payee" TEXT,
    "dateRange" JSONB,
    "type" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "presetFilters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "presetFilters_userId_isDeleted_idx" ON "presetFilters"("userId", "isDeleted");

-- AddForeignKey
ALTER TABLE "presetFilters" ADD CONSTRAINT "presetFilters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

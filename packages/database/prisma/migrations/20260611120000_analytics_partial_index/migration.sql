-- Partial index for analytics and list queries that always filter isDeleted = false
CREATE INDEX "transactions_active_by_user_date_idx"
ON "transactions" ("userId", "transactionDate" DESC)
WHERE "isDeleted" = false;

---
name: db-migration
description: Run a Prisma schema change and migration in this monorepo. Use when adding or modifying database models, fields, or enums.
---

# Database Migration Workflow

## Steps

1. **Edit schema** — modify `packages/database/prisma/schema.prisma`
   - Add models, fields, indexes, or enums
   - Use `@map` for table names, `@@map` for snake_case table mapping
   - Soft delete pattern: `isDeleted Boolean @default(false)` on Transaction

2. **Create migration**

   ```bash
   pnpm db:migrate
   ```

   Prisma will prompt for a migration name. Use descriptive snake_case: `add_transaction_notes`, `add_gmail_message_index`.

3. **Verify generated client**
   - Client regenerates to `packages/database/src/generated/prisma`
   - If dev servers are running, restart `pnpm dev` so `@repo/database` rebuilds

4. **Update app code**
   - TypeScript apps import enums from `@repo/constant` if the enum is shared
   - Update NestJS services/controllers that query the changed model
   - No Python changes needed unless gRPC contract also changed

## Checklist

- [ ] Schema change is backward-compatible or migration handles data
- [ ] New enum values added to `@repo/constant` if used by web/api
- [ ] Indexes added for new query patterns
- [ ] `pnpm db:migrate` succeeded without errors

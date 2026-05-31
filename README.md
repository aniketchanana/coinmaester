# finance-app

Turborepo monorepo for an AI-powered personal finance tracker.

## What's inside?

### Apps

- `web`: Next.js 16 frontend (UI scaffold — login, dashboard, shadcn/ui)
- `api-backend`: NestJS API (`GET /` → `Hello World!`)

### Packages

- `@repo/database`: Prisma schema + PostgreSQL client (for when you wire up the DB)
- `@repo/ui`: Shared shadcn/ui components
- `@repo/eslint-config`: Shared ESLint configs
- `@repo/typescript-config`: Shared TypeScript configs

## Getting started

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

Optional (database, when needed):

```bash
cp .env.example .env
pnpm db:up
pnpm db:migrate
```

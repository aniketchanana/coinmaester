# finance-app

Turborepo monorepo for an AI-powered personal finance tracker. Phase 1 delivers Google OAuth, Gmail polling, and email persistence. Phase 2 adds AI transaction extraction via BullMQ workers.

## What's inside?

### Apps

- `web`: Next.js 16 frontend with Auth.js, dashboard, and shadcn/ui
- `api-backend`: NestJS API with Gmail cron sync and REST endpoints
- `worker`: Phase 2 BullMQ consumer scaffold (no AI yet)

### Packages

- `@repo/database`: Prisma schema + PostgreSQL client
- `@repo/ui`: Shared shadcn/ui components
- `@repo/eslint-config`: Shared ESLint configs
- `@repo/typescript-config`: Shared TypeScript configs

## Getting started

### Prerequisites

- Node.js 18+
- pnpm 9
- Docker (for Postgres + Redis)

### Setup

```bash
# Install dependencies
pnpm install

# Copy env and fill in Google OAuth credentials
cp .env.example .env

# Start Postgres + Redis
pnpm db:up

# Run migrations
pnpm db:migrate

# Start all apps
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api

### Google Cloud setup

1. Create OAuth 2.0 Web client credentials
2. Redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Enable Gmail API
4. Add scope: `https://www.googleapis.com/auth/gmail.readonly`
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Architecture

- **Auth**: Auth.js v5 in `apps/web` with Prisma adapter; refresh tokens stored for background Gmail sync
- **Gmail sync**: NestJS cron every 5 minutes via `googleapis`
- **Queue**: BullMQ + Redis (Phase 2 scaffold); worker marks emails processed without AI until provider is chosen
- **UI**: Shared components in `packages/ui`; app-specific layout in `apps/web/components`

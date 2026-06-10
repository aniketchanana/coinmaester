FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
WORKDIR /app

FROM base AS pruner
COPY . .
RUN pnpm dlx turbo@2.9.16 prune api-backend --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/ .

ENV NODE_ENV=production
# Prisma generate reads DATABASE_URL from prisma.config.ts at build time (no DB connection needed).
ENV DATABASE_URL=postgresql://finance:finance@postgres:5432/finance_app?schema=public
RUN pnpm turbo build --filter=api-backend

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache postgresql-client

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-backend/dist ./apps/api-backend/dist
COPY --from=builder /app/apps/api-backend/node_modules ./apps/api-backend/node_modules
COPY --from=builder /app/apps/api-backend/package.json ./apps/api-backend/package.json
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/packages/constant/dist ./packages/constant/dist
COPY --from=builder /app/packages/constant/package.json ./packages/constant/package.json
COPY packages/proto ./packages/proto
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

COPY apps/api-backend/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /app/ingested-emails && chown -R nestjs:nodejs /app

USER nestjs
EXPOSE 3001 50051

ENTRYPOINT ["/app/docker-entrypoint.sh"]

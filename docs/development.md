# Local development

Use this path when forking to develop features or fix bugs. Apps run on the host; only Postgres and RabbitMQ run in Docker.

## Setup

1. **Install Node dependencies**

   ```bash
   pnpm install
   ```

2. **Start infrastructure**

   ```bash
   pnpm docker:dev
   ```

   Starts Postgres 16 (`:5432`) and RabbitMQ (`:5672`, management UI `:15672`).

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Set at least:

   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET` and `TOKEN_ENCRYPTION_KEY` — generate with `openssl rand -base64 32`

   Default LLM: `HF_MODEL_ID=microsoft/Phi-4-mini-instruct` (downloaded on first worker run).

4. **Migrate the database**

   ```bash
   pnpm db:migrate
   ```

5. **Install Python worker deps** (uv, not pip)

   ```bash
   cd apps/python-worker && uv sync && cd ../..
   ```

6. **Start all apps**

   ```bash
   pnpm dev
   ```

   Turborepo starts web, API, and the Python worker together.

   To run only the worker (e.g. while debugging):

   ```bash
   pnpm worker
   ```

## Expected ports

| Service | Port |
| ------- | ---- |
| Web | http://localhost:3000 |
| API REST | http://localhost:3001 |
| API gRPC | `localhost:50051` |
| Postgres | `localhost:5432` |
| RabbitMQ AMQP | `localhost:5672` |
| RabbitMQ UI | http://localhost:15672 (`finance` / `finance`) |

## Google OAuth (dev)

Register this redirect URI in Google Cloud Console:

```
http://localhost:3001/auth/google/callback
```

## Useful commands

| Command | Purpose |
| ------- | ------- |
| `pnpm lint` | Lint the monorepo |
| `pnpm format` | Prettier write |
| `pnpm check-types` | Typecheck |
| `pnpm db:studio` | Prisma Studio |
| `pnpm proto:generate` | Regenerate Python gRPC stubs after proto edits |
| `pnpm docker:down` | Stop infra containers |

## Conventions

- Package manager: **pnpm only**. Import shared code via `@repo/*` — never relative paths across packages.
- New env vars: add to `.env.example` and `turbo.json` `globalEnv` (and `apps/python-worker/config.py` when the worker needs them).
- Enums like transaction type / sync status: use `@repo/constant`.
- Worker never talks to Postgres; it completes work over gRPC.

See also [CONTRIBUTING.md](../CONTRIBUTING.md) and [architecture.md](architecture.md).

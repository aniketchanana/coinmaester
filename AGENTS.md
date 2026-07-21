# Finance App — Agent Context

pnpm + Turborepo monorepo for personal finance tracking from Gmail transaction emails.

## Apps

| App | Path | Stack |
| ------ | -------------------- | ------------------------------------------------- |
| Web | `apps/web` | Next.js 16, React 19, React Query, Tailwind v4 |
| API | `apps/api-backend` | NestJS 11, REST (3001) + gRPC (50051) |
| Worker | `apps/python-worker` | Python 3.14, uv, RabbitMQ consumer, Hugging Face LLM |

## Shared Packages

- `@repo/database` — Prisma 7 schema, migrations, client
- `@repo/proto` — gRPC `.proto` definitions
- `@repo/constant` — shared enums (SyncStatus, TransactionType)
- `@repo/ui` — shadcn-style Radix UI components
- `@repo/eslint-config`, `@repo/typescript-config` — shared tooling

## Email Processing Pipeline

```
Gmail API → api-backend (ingest) → body on disk (EMAIL_STORAGE_DIR)
         → RabbitMQ { gmailMessageId } → python-worker (host)
         → LLM classify + extract → gRPC CompleteProcessing → Postgres
```

The Python worker **never** writes to Postgres directly. All persistence goes through gRPC to `apps/api-backend`. The worker is **not** run in Docker (LLM needs host CPU); use `pnpm worker` or `pnpm dev`.

## Dev Workflow

```bash
pnpm docker:dev         # Postgres 16 + RabbitMQ
cp .env.example .env    # configure Google OAuth + secrets
pnpm db:migrate
pnpm dev                # all apps concurrently (includes worker)
# or: pnpm worker       # python-worker alone (e.g. with docker:prod)
```

`pnpm docker:prod` starts web + API + infra in Docker and prints a reminder to run `pnpm worker` on the host. Container networking overrides live in root `compose.env`.

External dependency: Hugging Face model weights (default `microsoft/Phi-4-mini-instruct`) loaded in-process by the python-worker via its local `llm_inference` module.

## Global Invariants

- **Package manager:** pnpm only. Import shared code via `@repo/*` workspace packages — never relative paths across packages.
- **Environment:** Single root `.env` shared by all apps. New vars must be added to `.env.example` and `turbo.json` `globalEnv`.
- **Constants:** Use `@repo/constant` for enums (`DEBIT`/`CREDIT`, sync statuses) — do not duplicate in app code.
- **Email storage:** Bodies live on disk at `EMAIL_STORAGE_DIR` (default `ingested-emails/`). DB stores relative path only.
- **Auth:** Google OAuth through api-backend only. JWT in httpOnly `access_token` cookie.

## Cursor Config

Project context for the agent lives in root `AGENTS.md`. Cursor-specific config:

| Path | Purpose |
| ---- | ------- |
| `.cursor/rules/*.mdc` | Scoped rules (auto-attached when matching files are open) |
| `.cursor/skills/*/SKILL.md` | Reusable agent workflows |
| `.cursor/agents/*.md` | Custom subagents |

Scoped rules:

- `web-frontend.mdc` — `apps/web/**`, `packages/ui/**`
- `api-backend.mdc` — `apps/api-backend/**`
- `python-worker.mdc` — `apps/python-worker/**`
- `database-prisma.mdc` — `packages/database/**`
- `grpc-contract.mdc` — proto + gRPC files across apps
